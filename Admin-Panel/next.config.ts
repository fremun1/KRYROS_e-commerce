import type { NextConfig } from "next";

// Require NEXT_PUBLIC_API_URL in production — never fall back to a hardcoded URL
const backendUrl = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'NEXT_PUBLIC_API_URL environment variable is required in production. ' +
        'Add it to your Render/Vercel environment variables.',
      );
    }
    console.warn('[config] NEXT_PUBLIC_API_URL not set — defaulting to http://localhost:8080 (dev only)');
    return 'http://localhost:8080';
  }
  return raw.replace(/\/api$/, '');
})();

const nextConfig: NextConfig = {
  devIndicators: false,
  productionBrowserSourceMaps: false,

  // ── Image Optimisation — Cloudinary ───────────────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/dkcgbgcuh/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2592000, // 30 days — Cloudinary images are immutable by version
  },

  // ── Router cache — keep pages fresh for 60 s client-side ─────────────────
  experimental: {
    staleTimes: {
      dynamic: 60,   // client-router cache for dynamic pages (seconds)
      static: 300,   // client-router cache for static pages
    },
  },

  // ── Security Headers ──────────────────────────────────────────────────────
  async headers() {
    return [
      // Static assets: long cache, immutable
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Public files (favicon, images etc.)
      {
        source: '/(.+\.(?:ico|png|jpg|jpeg|svg|webp|avif|woff2|woff))',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      // API routes: never cache
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, private' },
        ],
      },
      // All other routes (authenticated admin pages) — security headers
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              process.env.NODE_ENV === 'production' ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "connect-src 'self' https://api.cloudinary.com",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          // Admin pages: no cache (user-specific authenticated content)
          { key: 'Cache-Control', value: 'no-store, private' },
        ],
      },
    ];
  },

  // ── API Proxy — forward /api/* to the NestJS backend ─────────────────────
  async rewrites() {
    const proxy = (seg: string) => [
      { source: `/api/${seg}`, destination: `${backendUrl}/api/${seg}` },
      { source: `/api/${seg}/:rest*`, destination: `${backendUrl}/api/${seg}/:rest*` },
    ];

    return [
      ...proxy("auth"),
      ...proxy("orders"),
      ...proxy("products"),
      ...proxy("users"),
      ...proxy("categories"),
      ...proxy("brands"),
      ...proxy("reviews"),
      ...proxy("reports"),
      ...proxy("cms"),
      ...proxy("services"),
      ...proxy("settings"),
      ...proxy("shipping"),
      ...proxy("shipping-zones"),
      ...proxy("countries"),
      ...proxy("states"),
      ...proxy("cities"),
      ...proxy("credit"),
      ...proxy("wallet"),
      ...proxy("wholesale"),
      ...proxy("wishlist"),
      ...proxy("notifications"),
      ...proxy("newsletter"),
      ...proxy("payments"),
      ...proxy("payment-config"),
      ...proxy("pay-links"),
      ...proxy("cloudinary"),
    ];
  },
};

export default nextConfig;
