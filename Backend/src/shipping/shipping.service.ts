import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShippingMethodDto, UpdateShippingMethodDto } from './dto/shipping-method.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ShippingService {
  private readonly CACHE_TTL = 300000;

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(dto: CreateShippingMethodDto) {
    const method = await this.prisma.shippingMethod.create({
      data: {
        name: dto.name,
        description: dto.description,
        fee: new Prisma.Decimal(dto.fee),
        minThreshold: new Prisma.Decimal(dto.minThreshold ?? 0),
        estimatedDays: dto.estimatedDays,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    try {
      const globalZone = await this.prisma.shippingZone.findFirst({
        where: { countryId: null, stateId: null, cityId: null, name: 'Global Default' },
      });

      if (globalZone) {
        await this.prisma.locationShippingMethod.create({
          data: {
            zoneId: globalZone.id,
            name: method.name,
            price: method.fee,
            freeShippingThreshold: method.minThreshold,
            estimatedDays: method.estimatedDays,
            status: method.isActive,
            sortOrder: method.sortOrder,
          },
        });
      }
    } catch {
      // Sync failure is non-fatal — method still created
    }

    return method;
  }

  async findAll() {
    return this.prisma.shippingMethod.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findActive() {
    return this.prisma.shippingMethod.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { fee: 'asc' }],
    });
  }

  async findOne(id: string) {
    const method = await this.prisma.shippingMethod.findUnique({ where: { id } });
    if (!method) throw new NotFoundException('Shipping method not found');
    return method;
  }

  async update(id: string, dto: UpdateShippingMethodDto) {
    const oldMethod = await this.findOne(id);

    const updateData: any = { ...dto };
    if (dto.fee !== undefined) updateData.fee = new Prisma.Decimal(dto.fee);
    if (dto.minThreshold !== undefined) updateData.minThreshold = new Prisma.Decimal(dto.minThreshold);

    const updated = await this.prisma.shippingMethod.update({ where: { id }, data: updateData });

    try {
      const locationMethod = await this.prisma.locationShippingMethod.findFirst({
        where: { name: oldMethod.name },
      });

      if (locationMethod) {
        await this.prisma.locationShippingMethod.update({
          where: { id: locationMethod.id },
          data: {
            name: updated.name,
            price: updated.fee,
            freeShippingThreshold: updated.minThreshold,
            estimatedDays: updated.estimatedDays,
            status: updated.isActive,
            sortOrder: updated.sortOrder,
          },
        });
      }
    } catch {
      // Sync failure is non-fatal — method still updated
    }

    return updated;
  }

  async remove(id: string) {
    const method = await this.findOne(id);

    try {
      await this.prisma.locationShippingMethod.deleteMany({ where: { name: method.name } });
    } catch {
      // Non-fatal if sync record doesn't exist
    }

    return this.prisma.shippingMethod.delete({ where: { id } });
  }
}
