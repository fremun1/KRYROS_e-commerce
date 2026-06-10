import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';

const SETTINGS_TTL = 5 * 60 * 1000; // 5 minutes — settings rarely change

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async onModuleInit() {
    // Seed default settings if they don't exist
    const defaultSettings = [
      { key: 'shipping_fee', value: '25', type: 'number', category: 'shipping' },
      { key: 'free_shipping_threshold', value: '500', type: 'number', category: 'shipping' },
      { key: 'free_shipping_target_qty', value: '50', type: 'number', category: 'shipping' },
      { key: 'free_shipping_min_price', value: '100', type: 'number', category: 'shipping' },
      { key: 'opening_time', value: '08:00', type: 'string', category: 'general' },
      { key: 'closing_time', value: '18:00', type: 'string', category: 'general' },
      { key: 'is_store_closed_manual', value: 'false', type: 'boolean', category: 'general' },
      { key: 'store_closed_message', value: 'We are currently closed. Please come back later.', type: 'string', category: 'general' },
      { key: 'store_operating_days', value: 'Mon - Sun', type: 'string', category: 'general' },
      { key: 'next_opening_time', value: '06:00 PM', type: 'string', category: 'general' },
      { key: 'next_opening_day', value: 'Thursday', type: 'string', category: 'general' },
      { key: 'whatsapp_number', value: process.env.WHATSAPP_NUMBER || '', type: 'string', category: 'contact' },
      { key: 'processing_fee_rate', value: '0', type: 'number', category: 'general' },
    ];

    for (const s of defaultSettings) {
      const existing = await this.prisma.setting.findUnique({ where: { key: s.key } });
      if (!existing) {
        await this.prisma.setting.create({ data: s });
      }
    }
  }

  private async invalidateSettingsCache() {
    await Promise.all([
      this.cacheManager.del('settings:all'),
      this.cacheManager.del('settings:shipping'),
    ]);
  }

  async getAll() {
    const cached = await this.cacheManager.get<any[]>('settings:all');
    if (cached) return cached;
    const result = await this.prisma.setting.findMany();
    await this.cacheManager.set('settings:all', result, SETTINGS_TTL);
    return result;
  }

  async getByKey(key: string) {
    // Individual key lookups are not cached — used for admin updates
    return this.prisma.setting.findUnique({ where: { key } });
  }

  async update(key: string, value: string) {
    const result = await this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: {
        key,
        value,
        type: 'string',
        category: 'general'
      },
    });
    // Invalidate cache so next read picks up the new value
    await this.invalidateSettingsCache();
    return result;
  }

  async getShippingConfig() {
    const cached = await this.cacheManager.get<any>('settings:shipping');
    if (cached) return cached;

    const [fee, threshold, targetQty, minPrice] = await Promise.all([
      this.getByKey('shipping_fee'),
      this.getByKey('free_shipping_threshold'),
      this.getByKey('free_shipping_target_qty'),
      this.getByKey('free_shipping_min_price'),
    ]);

    const result = {
      fee: Number(fee?.value || 50),
      threshold: Number(threshold?.value || 5000),
      targetQty: Number(targetQty?.value || 50),
      minPrice: Number(minPrice?.value || 100),
    };
    await this.cacheManager.set('settings:shipping', result, SETTINGS_TTL);
    return result;
  }
}
