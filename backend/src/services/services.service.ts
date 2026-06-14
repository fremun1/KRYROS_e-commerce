import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.service.findMany({ where: { isActive: true } });
  }

  async findById(id: string) {
    return this.prisma.service.findUnique({ where: { id } });
  }

  async book(data: {
    userId: string;
    serviceId: string;
    scheduledDate: string;
    scheduledTime: string;
    notes?: string;
  }) {
    return this.prisma.serviceBooking.create({
      data: {
        userId: data.userId,
        serviceId: data.serviceId,
        scheduledDate: new Date(data.scheduledDate),
        scheduledTime: data.scheduledTime,
        notes: data.notes,
      },
    });
  }

  async listAll() {
    return this.prisma.service.findMany();
  }

  async listBookings() {
    return this.prisma.serviceBooking.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        service: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    name: string; slug: string; description?: string; price: number; category: string; duration: string; image?: string; features?: string[]; isActive?: boolean;
  }) {
    return this.prisma.service.create({ data });
  }

  async update(id: string, data: {
    name?: string; slug?: string; description?: string; price?: number; category?: string; duration?: string; image?: string; features?: string[]; isActive?: boolean;
  }) {
    return this.prisma.service.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.service.delete({ where: { id } });
  }

  async seedSampleServices() {
    const count = await this.prisma.service.count();
    if (count > 0) {
      return { success: true, message: 'Services already exist', count };
    }
    const items = [
      { name: 'Phone Repair', slug: 'phone-repair', description: 'Screen replacement, battery, charging port', price: 300, category: 'Repairs', duration: '1-2 hours', image: '', features: ['Genuine parts', '90-day warranty'], isActive: true },
      { name: 'Laptop Repair', slug: 'laptop-repair', description: 'Diagnostics, keyboard, screen, malware removal', price: 500, category: 'Repairs', duration: '2-4 hours', image: '', features: ['Expert technicians'], isActive: true },
      { name: 'Data Recovery', slug: 'data-recovery', description: 'Recover data from phones, laptops, storage', price: 500, category: 'Support', duration: '24-48 hours', image: '', features: ['Secure handling'], isActive: true },
      { name: 'Software Installation', slug: 'software-installation', description: 'OS and app installation and updates', price: 200, category: 'Installation', duration: '1-2 hours', image: '', features: ['Licensed software'], isActive: true },
    ];
    const created = await this.prisma.$transaction(items.map(item => this.prisma.service.create({ data: item })));
    return { success: true, count: created.length, services: created };
  }
}
