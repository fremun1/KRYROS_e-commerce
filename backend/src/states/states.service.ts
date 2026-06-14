import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStateDto } from './dto/create-state.dto';
import { UpdateStateDto } from './dto/update-state.dto';

@Injectable()
export class StatesService {
  private readonly CACHE_TTL = 600000;

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createStateDto: CreateStateDto) {
    return this.prisma.state.create({
      data: createStateDto,
    });
  }

  async findAll(countryId?: string) {
    return this.prisma.state.findMany({
      where: countryId ? { countryId } : {},
      include: {
        _count: {
          select: { cities: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.state.findUnique({
      where: { id },
      include: {
        country: true,
        cities: true,
      },
    });
  }

  async update(id: string, updateStateDto: UpdateStateDto) {
    return this.prisma.state.update({
      where: { id },
      data: updateStateDto,
    });
  }

  async remove(id: string) {
    // Soft delete — preserves cities and shipping zones referencing this state
    return this.prisma.state.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
