import { Injectable, ForbiddenException, CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { SettingsService } from '../../settings/settings.service';
import { GeolocationService } from '../../common/services/geolocation.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

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
  ) {}

  private shouldSkip(path: string): boolean {
    return SKIP_PATHS.some(skipPath => path.startsWith(skipPath));
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const path = request.url?.split('?')[0] || '';
    
    // Skip region check for public paths
    if (this.shouldSkip(path)) {
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
