import 'reflect-metadata';
import * as Sentry from '@sentry/node';

const SENTRY_DSN = process.env.SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import * as helmet from 'helmet';
import { json, urlencoded } from 'express';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    try {
      execSync('npx prisma db push', { stdio: 'inherit' });
    } catch {
      // DB push is optional in development — continue startup
    }
  }

  // Seed a SUPER_ADMIN account if env vars are provided and account does not exist
  const adminEmail = process.env.ADMIN_SEED_EMAIL;
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (adminEmail && adminPassword) {
    const prisma = new PrismaClient();
    try {
      const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
      if (!existing) {
        const hashed = await bcrypt.hash(adminPassword, 12);
        await prisma.user.create({
          data: {
            email: adminEmail,
            password: hashed,
            firstName: 'Admin',
            lastName: 'User',
            role: 'SUPER_ADMIN',
            isVerified: true,
            isActive: true,
          },
        });
      }
    } finally {
      await prisma.$disconnect();
    }
  }

  const app = await NestFactory.create(AppModule, { logger: isProd ? ['error', 'warn'] : ['log', 'error', 'warn', 'debug'] });

  // Trust the first hop from the reverse proxy (Render, Nginx, etc.)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Security headers — CSP, HSTS, XSS protection, clickjacking prevention
  app.use(
    (helmet as any).default({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'https:'],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginEmbedderPolicy: false,
      permissionsPolicy: {
        features: {
          camera: [],
          microphone: [],
          geolocation: [],
          payment: [],
          usb: [],
        },
      },
    }),
  );

  // Body size limits — kept generous for base64 image uploads
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  // CORS — explicit allowlist with wildcard subdomain support (e.g. https://*.replit.dev)
  const rawOrigins = process.env.CORS_ORIGINS || (isProd
    ? ''
    : 'http://localhost:3000,http://localhost:3001,http://localhost:5000');
  const corsList = rawOrigins
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  function originAllowed(origin: string, patterns: string[]): boolean {
    return patterns.some((pattern) => {
      if (pattern.includes('*')) {
        const regexStr =
          '^' +
          pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]+') +
          '$';
        return new RegExp(regexStr).test(origin);
      }
      return pattern === origin;
    });
  }


  // Cache-Control: no-store on all sensitive API responses ──────────────────
  // Prevents browsers and shared proxies from caching auth/user/financial data.
  const SENSITIVE_PREFIXES = [
    '/api/auth',
    '/api/users',
    '/api/orders',
    '/api/wallet',
    '/api/payments',
    '/api/reports',
    '/api/credit',
  ];
  app.use((req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    const isSensitive = SENSITIVE_PREFIXES.some((prefix) => req.path.startsWith(prefix));
    if (isSensitive) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
    }
    next();
  });

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (corsList.length === 0) return callback(null, false);
      if (originAllowed(origin, corsList)) return callback(null, true);
      callback(null, false);
    },
    credentials: true,
  });

  // Global exception filter — consistent JSON errors, no stack traces in production
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global validation — reject unknown fields and transform types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger — development only
  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle('KRYROS API')
      .setDescription('KRYROS Mobile Tech — Enterprise Commerce Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
  
  // ── Health check — fast ping for monitoring and keep-alive ──────────────────
  // Responds immediately, no DB or auth needed.
  app.getHttpAdapter().get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 8080;
  await app.listen(port);
}

bootstrap();
