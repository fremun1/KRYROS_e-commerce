import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShippingZoneDto } from './dto/create-shipping-zone.dto';
import { UpdateShippingZoneDto } from './dto/update-shipping-zone.dto';
import { CreateLocationShippingMethodDto } from './dto/create-location-shipping-method.dto';

@Injectable()
export class ShippingZonesService implements OnModuleInit {
  private readonly CACHE_TTL = 600000;

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async onModuleInit() {
    try {
      await this.ensureGlobalDefaultZone();
      await this.syncGlobalMethods();
      await this.ensureFeatureFlag();
    } catch {
      // Initialization errors are non-fatal — service still usable
    }
  }

  private async ensureGlobalDefaultZone() {
    const globalZone = await this.prisma.shippingZone.findUnique({
      where: { name: 'Global Default' },
    });

    if (!globalZone) {
      await this.prisma.shippingZone.create({
        data: {
          name: 'Global Default',
          priority: 0,
        },
      });
    }
  }

  private async syncGlobalMethods() {
    const globalZone = await this.prisma.shippingZone.findUnique({
      where: { name: 'Global Default' },
      include: { shippingMethods: true },
    });

    if (!globalZone) return;

    const globalMethods = await this.prisma.shippingMethod.findMany();

    for (const gm of globalMethods) {
      const exists = globalZone.shippingMethods.find(m => m.name === gm.name);
      if (!exists) {
        await this.prisma.locationShippingMethod.create({
          data: {
            zoneId: globalZone.id,
            name: gm.name,
            price: gm.fee,
            freeShippingThreshold: gm.minThreshold,
            estimatedDays: gm.estimatedDays,
            status: gm.isActive,
          },
        });
      }
    }
  }

  private async ensureFeatureFlag() {
    const flag = await this.prisma.setting.findUnique({
      where: { key: 'ENABLE_LOCATION_SHIPPING' },
    });

    if (!flag) {
      await this.prisma.setting.create({
        data: {
          key: 'ENABLE_LOCATION_SHIPPING',
          value: 'false',
          type: 'boolean',
          category: 'shipping',
        },
      });
    }
  }

  async isEnabled() {
    const flag = await this.prisma.setting.findUnique({
      where: { key: 'ENABLE_LOCATION_SHIPPING' },
    });
    return flag?.value === 'true';
  }

  async toggleFeature(enabled: boolean) {
    return this.prisma.setting.update({
      where: { key: 'ENABLE_LOCATION_SHIPPING' },
      data: { value: String(enabled) },
    });
  }

  async create(createShippingZoneDto: CreateShippingZoneDto) {
    const { name, countryId, stateId, cityId, priority, region, shippingMethod, rate, minOrder, isActive } = createShippingZoneDto;
    return this.prisma.shippingZone.create({
      data: {
        name,
        countryId: countryId || null,
        stateId: stateId || null,
        cityId: cityId || null,
        priority: priority ?? 0,
        region: region || null,
        shippingMethod: shippingMethod || null,
        rate: rate != null ? rate : null,
        minOrder: minOrder != null ? minOrder : null,
        isActive: isActive ?? true,
      },
    });
  }

  async findAll() {
    return this.prisma.shippingZone.findMany({
      include: {
        country: true,
        state: true,
        city: true,
        shippingMethods: true,
        _count: {
          select: { shippingMethods: true },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(id: string) {
    return this.prisma.shippingZone.findUnique({
      where: { id },
      include: {
        country: true,
        state: true,
        city: true,
        shippingMethods: true,
      },
    });
  }

  async update(id: string, updateShippingZoneDto: UpdateShippingZoneDto) {
    const { name, countryId, stateId, cityId, priority, region, shippingMethod, rate, minOrder, isActive } = updateShippingZoneDto;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (countryId !== undefined) updateData.countryId = countryId || null;
    if (stateId !== undefined) updateData.stateId = stateId || null;
    if (cityId !== undefined) updateData.cityId = cityId || null;
    if (priority !== undefined) updateData.priority = priority;
    if (region !== undefined) updateData.region = region || null;
    if (shippingMethod !== undefined) updateData.shippingMethod = shippingMethod || null;
    if (rate !== undefined) updateData.rate = rate != null ? rate : null;
    if (minOrder !== undefined) updateData.minOrder = minOrder != null ? minOrder : null;
    if (isActive !== undefined) updateData.isActive = isActive;
    return this.prisma.shippingZone.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    return this.prisma.shippingZone.delete({
      where: { id },
    });
  }

  // Shipping Methods
  async addMethod(dto: CreateLocationShippingMethodDto) {
    return this.prisma.locationShippingMethod.create({
      data: dto,
    });
  }

  async updateMethod(id: string, data: any) {
    return this.prisma.locationShippingMethod.update({
      where: { id },
      data,
    });
  }

  async removeMethod(id: string) {
    return this.prisma.locationShippingMethod.delete({
      where: { id },
    });
  }

  // MATCHING LOGIC (VERY IMPORTANT)
  async findMatchingMethods(countryId?: string, stateId?: string, cityId?: string, manual?: boolean, stateName?: string, cityName?: string) {
    // If NOT manual, try structured matching
    if (!manual) {
      // 1. Try matching by city_id
      if (cityId) {
        const zone = await this.prisma.shippingZone.findFirst({
          where: { cityId, isActive: true },
          include: { 
            shippingMethods: { where: { status: true }, orderBy: { sortOrder: 'asc' } },
            country: true
          },
          orderBy: { priority: 'desc' },
        });
        if (zone && zone.shippingMethods.length > 0) {
          return zone.shippingMethods.map(m => ({
            ...m,
            currencyCode: zone.country?.currencyCode || 'USD',
            exchangeRate: Number(zone.country?.exchangeRate || 1)
          }));
        }
      }

      // 2. Try matching by state_id
      if (stateId) {
        const zone = await this.prisma.shippingZone.findFirst({
          where: { stateId, isActive: true },
          include: { 
            shippingMethods: { where: { status: true }, orderBy: { sortOrder: 'asc' } },
            country: true
          },
          orderBy: { priority: 'desc' },
        });
        if (zone && zone.shippingMethods.length > 0) {
          return zone.shippingMethods.map(m => ({
            ...m,
            currencyCode: zone.country?.currencyCode || 'USD',
            exchangeRate: Number(zone.country?.exchangeRate || 1)
          }));
        }
      }
    } else {
      // If MANUAL, try matching by state name (if it exists as a structured state in the DB)
      if (stateName && countryId) {
        const state = await this.prisma.state.findFirst({
          where: { 
            name: { equals: stateName, mode: 'insensitive' },
            countryId 
          }
        });
        
        if (state) {
          const zone = await this.prisma.shippingZone.findFirst({
            where: { stateId: state.id, isActive: true },
            include: { 
              shippingMethods: { where: { status: true }, orderBy: { sortOrder: 'asc' } },
              country: true
            },
            orderBy: { priority: 'desc' },
          });
          if (zone && zone.shippingMethods.length > 0) {
            return zone.shippingMethods.map(m => ({
              ...m,
              currencyCode: zone.country?.currencyCode || 'USD',
              exchangeRate: Number(zone.country?.exchangeRate || 1)
            }));
          }
        }
      }
    }

    // 3. Try matching by country_id (Common for both manual and non-manual)
    if (countryId) {
      const zone = await this.prisma.shippingZone.findFirst({
        where: { countryId, isActive: true },
        include: { 
          shippingMethods: { where: { status: true }, orderBy: { sortOrder: 'asc' } },
          country: true
        },
        orderBy: { priority: 'desc' },
      });
      if (zone && zone.shippingMethods.length > 0) {
        // Add country info to each method for frontend currency handling
        return zone.shippingMethods.map(m => ({
          ...m,
          currencyCode: zone.country?.currencyCode || 'USD',
          exchangeRate: Number(zone.country?.exchangeRate || 1)
        }));
      }
    }

    // 4. Fallback to GLOBAL zone
    const globalZone = await this.prisma.shippingZone.findFirst({
      where: { 
        countryId: null, 
        stateId: null, 
        cityId: null, 
        isActive: true 
      },
      include: { 
        shippingMethods: { where: { status: true }, orderBy: { sortOrder: 'asc' } },
        country: true
      },
    });

    if (globalZone) {
      return globalZone.shippingMethods.map(m => ({
        ...m,
        currencyCode: globalZone.country?.currencyCode || 'USD',
        exchangeRate: Number(globalZone.country?.exchangeRate || 1)
      }));
    }

    return [];
  }
}
