import { Injectable, ForbiddenException, CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { SettingsService } from '../../settings/settings.service';
import { GeolocationService } from '../../common/services/geolocation.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class RegionRestrictionGuard implements CanActivate {
  constructor(
    private settingsService: SettingsService,
    private geolocationService: GeolocationService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
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
