import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePickupStationDto, UpdatePickupStationDto } from './dto/pickup-station.dto';

@Injectable()
export class PickupStationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePickupStationDto) {
    return this.prisma.pickupStation.create({
      data: {
        name: dto.name,
        address: dto.address,
        city: dto.city,
        state: dto.state || null,
        country: dto.country || 'Zambia',
        latitude: dto.latitude || null,
        longitude: dto.longitude || null,
        phone: dto.phone || null,
        email: dto.email || null,
        openingHours: dto.openingHours || null,
        description: dto.description || null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(city?: string, isActive?: boolean) {
    return this.prisma.pickupStation.findMany({
      where: {
        ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      orderBy: [{ city: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const station = await this.prisma.pickupStation.findUnique({ where: { id } });
    if (!station) throw new NotFoundException('Pickup station not found');
    return station;
  }

  async update(id: string, dto: UpdatePickupStationDto) {
    await this.findOne(id);
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.state !== undefined) updateData.state = dto.state || null;
    if (dto.country !== undefined) updateData.country = dto.country;
    if (dto.latitude !== undefined) updateData.latitude = dto.latitude;
    if (dto.longitude !== undefined) updateData.longitude = dto.longitude;
    if (dto.phone !== undefined) updateData.phone = dto.phone || null;
    if (dto.email !== undefined) updateData.email = dto.email || null;
    if (dto.openingHours !== undefined) updateData.openingHours = dto.openingHours || null;
    if (dto.description !== undefined) updateData.description = dto.description || null;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    return this.prisma.pickupStation.update({ where: { id }, data: updateData });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.pickupStation.delete({ where: { id } });
  }

  async toggleStatus(id: string, isActive: boolean) {
    await this.findOne(id);
    return this.prisma.pickupStation.update({ where: { id }, data: { isActive } });
  }
}
