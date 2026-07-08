import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface GeoLocationData {
  countryCode: string;
  countryName: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

@Injectable()
export class GeolocationService {
  private readonly logger = new Logger(GeolocationService.name);
  // ipapi: https://ipapi.co/<ip>/json/
  // ip-api: https://ip-api.com/json/<ip>
  private readonly PRIMARY_GEO_API = 'https://ipapi.co';
  private readonly FALLBACK_GEO_API = 'https://ip-api.com/json/';

  /**
   * Detect user's country by IP address
   * Tries primary provider first, then fallback
   * @param ipAddress - User's IP address (can be IPv4 or IPv6)
   * @returns GeoLocationData with country code and other location info
   */
  async detectCountryByIp(ipAddress: string): Promise<GeoLocationData | null> {
    const normalizedIp = this.normalizeIp(ipAddress);

    // Validate IP format (basic check)
    if (!this.isValidIp(normalizedIp)) {
      this.logger.warn(`Invalid IP address format: ${ipAddress}`);
      return null;
    }

    // Try primary provider
    try {
      this.logger.debug(`Attempting geolocation for IP ${normalizedIp} via primary provider`);
      const response = await axios.get(`${this.PRIMARY_GEO_API}/${normalizedIp}/json/`, {
        timeout: 5000,
      });

      if (response.data && response.data.country_code) {
        return {
          countryCode: response.data.country_code.toUpperCase(),
          countryName: response.data.country_name || '',
          city: response.data.city || undefined,
          region: response.data.region || undefined,
          latitude: response.data.latitude,
          longitude: response.data.longitude,
          timezone: response.data.timezone || undefined,
        };
      }
    } catch (primaryError) {
      this.logger.warn(`Primary geolocation provider failed: ${primaryError.message}`);
    }

    // Try fallback provider
    try {
      this.logger.debug(`Attempting geolocation for IP ${normalizedIp} via fallback provider`);
      const response = await axios.get(`${this.FALLBACK_GEO_API}${normalizedIp}`, {
        timeout: 5000,
      });

      if (response.data && response.data.countryCode) {
        return {
          countryCode: response.data.countryCode.toUpperCase(),
          countryName: response.data.country || '',
          city: response.data.city || undefined,
          region: response.data.regionName || undefined,
          latitude: response.data.lat,
          longitude: response.data.lon,
          timezone: response.data.timezone || undefined,
        };
      }
    } catch (fallbackError) {
      this.logger.error(`Fallback geolocation provider failed: ${fallbackError.message}`);
    }

    this.logger.warn(`Could not detect location for IP: ${normalizedIp}`);
    return null;
  }

  /**
   * Extract client IP from request
   * Handles proxies and load balancers
   * @param request - Express request object
   * @returns Client IP address
   */
  getClientIp(request: any): string {
    // Check for IP from various headers (proxy headers)
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return this.normalizeIp(forwarded.split(',')[0].trim());
    }

    // Check other common proxy headers
    const clientIp = request.headers['x-client-ip'] ||
                     request.headers['x-real-ip'] ||
                     request.socket.remoteAddress ||
                     request.connection.remoteAddress ||
                     request.ip;

    return this.normalizeIp(clientIp || 'unknown');
  }

  /**
   * Basic IP validation (IPv4 and IPv6)
   * @param ip - IP address to validate
   * @returns true if valid IP format
   */
  private isValidIp(ip: string): boolean {
    if (!ip || typeof ip !== 'string') return false;

    // IPv4 regex
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(ip)) {
      const parts = ip.split('.');
      return parts.every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
      });
    }

    // IPv6 regex (simplified)
    const ipv6Regex = /^([\da-f]{0,4}:){2,7}[\da-f]{0,4}$/i;
    return ipv6Regex.test(ip);
  }

  /**
   * Normalize common proxy / Node formats:
   * - "::ffff:1.2.3.4"  -> "1.2.3.4"
   * - remove surrounding brackets, trim spaces
   */
  private normalizeIp(ip: string): string {
    if (!ip || typeof ip !== 'string') return 'unknown';
    let value = ip.trim();

    // In some setups request.ip can be "::ffff:1.2.3.4"
    if (value.startsWith('::ffff:')) value = value.slice('::ffff:'.length);

    // Strip brackets that might appear with IPv6 in some headers
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1);
    }

    return value;
  }
}
