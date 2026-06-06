import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WholesaleService {
  constructor(private prisma: PrismaService) {}

  async getAccount(userId: string) {
    return this.prisma.wholesaleAccount.findUnique({
      where: { userId },
      include: { user: true, prices: true },
    });
  }

  async findAllAccounts(status?: string) {
    return this.prisma.wholesaleAccount.findMany({
      where: status ? { status: status as any } : {},
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateAccountStatus(id: string, status: string, notes?: string) {
    return this.prisma.wholesaleAccount.update({
      where: { id },
      data: { status: status as any, notes },
    });
  }

  async updateAccount(id: string, data: {
    companyName?: string;
    taxId?: string;
    address?: string;
    city?: string;
    phone?: string;
    contactPerson?: string;
    discountTier?: number;
    tierName?: string;
    creditLimit?: number;
    status?: string;
    notes?: string;
  }) {
    const updateData: any = { ...data };
    if (data.creditLimit !== undefined) {
      updateData.creditLimit = new Prisma.Decimal(data.creditLimit);
    }
    if (data.status !== undefined) {
      updateData.status = data.status as any;
    }
    return this.prisma.wholesaleAccount.update({ where: { id }, data: updateData });
  }

  /** Admin creates a wholesale account directly (without user applying) */
  async adminCreate(data: {
    companyName: string;
    taxId?: string;
    address?: string;
    city?: string;
    phone?: string;
    contactPerson?: string;
    discountTier?: number;
    tierName?: string;
    creditLimit?: number;
    status?: string;
    notes?: string;
    userId?: string;
  }) {
    // If no userId provided, create a placeholder - admin-created accounts may not have a linked user
    const createData: any = {
      companyName: data.companyName,
      taxId: data.taxId || null,
      address: data.address || null,
      city: data.city || null,
      phone: data.phone || null,
      contactPerson: data.contactPerson || null,
      discountTier: data.discountTier ?? 1,
      tierName: data.tierName || null,
      creditLimit: data.creditLimit != null ? new Prisma.Decimal(data.creditLimit) : null,
      status: (data.status as any) || 'ACTIVE',
      notes: data.notes || null,
    };
    if (data.userId) {
      createData.userId = data.userId;
      return this.prisma.wholesaleAccount.create({ data: createData });
    }
    // Cannot create without userId due to FK — require userId from admin
    throw new Error('userId is required to create a wholesale account');
  }

  async deleteAccount(id: string) {
    const account = await this.prisma.wholesaleAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Wholesale account not found');
    return this.prisma.wholesaleAccount.delete({ where: { id } });
  }

  async apply(data: {
    userId: string;
    companyName: string;
    taxId?: string;
    address?: string;
    contactPerson?: string;
    discountTier?: number;
  }) {
    return this.prisma.wholesaleAccount.create({
      data: {
        userId: data.userId,
        companyName: data.companyName,
        taxId: data.taxId,
        address: data.address,
        contactPerson: data.contactPerson,
        discountTier: data.discountTier ?? 1,
        status: 'PENDING',
      },
    });
  }

  // ── Wholesale Deals ───────────────────────────────────────
  async findAllDeals(accountId?: string) {
    return this.prisma.wholesaleDeal.findMany({
      where: accountId ? { accountId } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDeal(data: {
    title: string;
    description?: string;
    discount?: number;
    minOrder?: number;
    validUntil?: string;
    isActive?: boolean;
    accountId?: string;
  }) {
    return this.prisma.wholesaleDeal.create({
      data: {
        title: data.title,
        description: data.description || null,
        discount: data.discount != null ? new Prisma.Decimal(data.discount) : null,
        minOrder: data.minOrder != null ? new Prisma.Decimal(data.minOrder) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        isActive: data.isActive ?? true,
        accountId: data.accountId || null,
      },
    });
  }

  async updateDeal(id: string, data: any) {
    const updateData: any = { ...data };
    if (data.discount !== undefined) updateData.discount = data.discount != null ? new Prisma.Decimal(data.discount) : null;
    if (data.minOrder !== undefined) updateData.minOrder = data.minOrder != null ? new Prisma.Decimal(data.minOrder) : null;
    if (data.validUntil !== undefined) updateData.validUntil = data.validUntil ? new Date(data.validUntil) : null;
    return this.prisma.wholesaleDeal.update({ where: { id }, data: updateData });
  }

  async deleteDeal(id: string) {
    return this.prisma.wholesaleDeal.delete({ where: { id } });
  }

  // ── Tiered Pricing for Products ─────────────────────────
  async setProductWholesalePrices(productId: string, prices: { minQuantity: number, price: number, accountId?: string }[]) {
    await this.prisma.wholesalePrice.deleteMany({ where: { productId } });
    return this.prisma.wholesalePrice.createMany({
      data: prices.map(p => ({
        productId,
        minQuantity: p.minQuantity,
        price: p.price,
        accountId: p.accountId || null,
      })),
    });
  }

  async getProductWholesalePrices(productId: string) {
    return this.prisma.wholesalePrice.findMany({
      where: { productId },
      orderBy: { minQuantity: 'asc' },
    });
  }
}
