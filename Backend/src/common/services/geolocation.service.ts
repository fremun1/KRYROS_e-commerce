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
  private readonly PRIMARY_GEO_API = 'https://ipapi.co/json/';
  private readonly FALLBACK_GEO_API = 'https://ip-api.com/json/';

  /**
   * Detect user's country by IP address
   * Tries primary provider first, then fallback
   * @param ipAddress - User's IP address (can be IPv4 or IPv6)
   * @returns GeoLocationData with country code and other location info
   */
  async detectCountryByIp(ipAddress: string): Promise<GeoLocationData | null> {
    // Validate IP format (basic check)
    if (!this.isValidIp(ipAddress)) {
      this.logger.warn(`Invalid IP address format: ${ipAddress}`);
      return null;
    }

    // Try primary provider
    try {
      this.logger.debug(`Attempting geolocation for IP ${ipAddress} via primary provider`);
      const response = await axios.get(`${this.PRIMARY_GEO_API}${ipAddress}`, {
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
      this.logger.debug(`Attempting geolocation for IP ${ipAddress} via fallback provider`);
      const response = await axios.get(`${this.FALLBACK_GEO_API}${ipAddress}`, {
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

    this.logger.warn(`Could not detect location for IP: ${ipAddress}`);
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
      return forwarded.split(',')[0].trim();
    }

    // Check other common proxy headers
    const clientIp = request.headers['x-client-ip'] ||
                     request.headers['x-real-ip'] ||
                     request.socket.remoteAddress ||
                     request.connection.remoteAddress ||
                     request.ip;

    return clientIp || 'unknown';
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
}
