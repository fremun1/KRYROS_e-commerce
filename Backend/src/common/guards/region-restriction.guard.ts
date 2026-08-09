import { Injectable, ForbiddenException, CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { SettingsService } from '../../settings/settings.service';
import { GeolocationService } from '../../common/services/geolocation.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '@prisma/client';

// Admin-level roles that trigger region restriction
const ADMIN_ROLES = new Set<UserRole>([
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.MANAGER,
  UserRole.STAFF,
]);

function normalizeIdentifier(value?: string | null) {
  const trimmed = value?.trim() || '';
  if (!trimmed) return trimmed;
  if (trimmed.includes('@')) return trimmed.toLowerCase();

  const normalizedPhone = trimmed.replace(/[^\d+]/g, '');
  if (normalizedPhone.startsWith('+')) {
    return `+${normalizedPhone.slice(1).replace(/\D/g, '')}`;
  }

  return normalizedPhone.replace(/\D/g, '');
}

function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

// Paths that should NOT be checked for region restriction
const SKIP_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/check',
  '/api/auth/send-otp',
  '/api/auth/verify-otp',
  '/api/auth/verify-email',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/logout-all',
  '/api/auth/me',
  '/api/auth/2fa/status',
  '/api/auth/2fa/setup',
  '/api/auth/2fa/enable',
  '/api/auth/2fa/disable',
  '/api/auth/2fa/validate',
  '/api/auth/check-region',
  '/api/health',
  '/api/settings/store-status',
  '/api/countries',
  '/api/states',
  '/api/cities',
];

@Injectable()
export class RegionRestrictionGuard implements CanActivate {
  constructor(
    private settingsService: SettingsService,
    private geolocationService: GeolocationService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  private shouldSkip(path: string): boolean {
    return SKIP_PATHS.some(skipPath => path.startsWith(skipPath));
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const path = request.url?.split('?')[0] || '';
    
    // Determine if this is an administrative request
    let isAdminRequest = false;

    // 1. Check if the handler/class requires administrative roles
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.some(role => ADMIN_ROLES.has(role))) {
      isAdminRequest = true;
    }

    // 2. Check for login / 2FA validate endpoints
    if (!isAdminRequest && path === '/api/auth/login' && request.method === 'POST') {
      const identifier = request.body?.identifier;
      if (identifier) {
        const normalized = normalizeIdentifier(identifier);
        if (normalized) {
          const user = await this.prisma.user.findFirst({
            where: {
              OR: [
                { email: normalized },
                { phone: normalized },
              ],
            },
            select: { role: true },
          });
          if (user && ADMIN_ROLES.has(user.role)) {
            isAdminRequest = true;
          }
        }
      }
    }

    if (!isAdminRequest && path === '/api/auth/2fa/validate' && request.method === 'POST') {
      const token = request.body?.twoFactorToken;
      if (token) {
        const payload = decodeJwtPayload(token);
        if (payload && payload.sub) {
          const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: { role: true },
          });
          if (user && ADMIN_ROLES.has(user.role)) {
            isAdminRequest = true;
          }
        }
      }
    }

    // 3. Skip region check if it's a public / customer request and is in the skip paths list
    if (!isAdminRequest && this.shouldSkip(path)) {
      return true;
    }

    // If it is not an administrative request, we don't enforce region restriction
    if (!isAdminRequest) {
      return true;
    }

    const ip = this.geolocationService.getClientIp(request);

    const enabledSetting = await this.settingsService.getByKey('admin_region_restriction_enabled');
    if (!enabledSetting || enabledSetting.value !== 'true') {
      return true;
    }

    const cacheKey = `region-check:${ip}`;
    const cached = await this.cacheManager.get<string>(cacheKey);
    if (cached === 'blocked') {
      throw new ForbiddenException('Access from your region is not permitted');
    }
    if (cached === 'allowed') {
      return true;
    }

    const geoData = await this.geolocationService.detectCountryByIp(ip);
    if (!geoData) {
      return true;
    }

    const blockedSetting = await this.settingsService.getByKey('admin_blocked_countries');
    const blockedList = blockedSetting?.value || '';
    const blockedCountries = blockedList
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    if (blockedCountries.includes(geoData.countryCode)) {
      await this.cacheManager.set(cacheKey, 'blocked', 300000);
      throw new ForbiddenException('Access from your region is not permitted');
    }

    await this.cacheManager.set(cacheKey, 'allowed', 300000);
    return true;
  }
}
