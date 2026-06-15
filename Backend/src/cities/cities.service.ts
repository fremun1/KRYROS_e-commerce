import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';

@Injectable()
export class CitiesService {
  private readonly CACHE_TTL = 600000;

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createCityDto: CreateCityDto) {
    return this.prisma.city.create({
      data: createCityDto,
    });
  }

  async findAll(stateId?: string) {
    return this.prisma.city.findMany({
      where: stateId ? { stateId } : {},
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.city.findUnique({
      where: { id },
      include: {
        state: {
          include: { country: true },
        },
      },
    });
  }

  async update(id: string, updateCityDto: UpdateCityDto) {
    return this.prisma.city.update({
      where: { id },
      data: updateCityDto,
    });
  }

  async remove(id: string) {
    // Soft delete — preserves shipping zones referencing this city
    return this.prisma.city.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
