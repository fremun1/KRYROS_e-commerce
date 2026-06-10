import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApplyCreditDto } from './dto/apply-credit.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CreditService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    let profile = await this.prisma.creditProfile.findUnique({ where: { userId } });
    if (!profile) {
      profile = await this.prisma.creditProfile.create({
        data: { userId, creditLimit: 0, creditScore: 500 },
      });
    }
    return profile;
  }

  async getPlans(params?: { productId?: string }) {
    // If productId is provided, try to find matching plans
    if (params?.productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: params.productId },
        include: { category: true, brand: true }
      });

      if (product) {
        const matchingPlans = await this.prisma.creditPlan.findMany({
          where: {
            isActive: true,
            AND: [
              { minimumAmount: { lte: product.price } },
              {
                OR: [
                  { maximumAmount: { gte: product.price } },
                  { maximumAmount: 0 } // 0 means no limit
                ]
              },
              {
                OR: [
                  // Specific match for brand/category
                  {
                    OR: [
                      { targetBrandId: product.brandId },
                      { targetCategoryId: product.categoryId }
                    ]
                  },
                  // General match (no brand/category constraint)
                  {
                    targetBrandId: null,
                    targetCategoryId: null,
                  }
                ]
              }
            ]
          },
          orderBy: { duration: 'asc' }
        });

        if (matchingPlans.length > 0) {
          return matchingPlans;
        }
      }
    }

    // Fallback: return all active plans if no specific match or no productId
    return this.prisma.creditPlan.findMany({ 
      where: { isActive: true },
      include: { brand: true, category: true },
      orderBy: { duration: 'asc' }
    });
  }

  async createPlan(data: {
    name: string;
    duration: number;
    interestRate: number;
    minimumAmount: number;
    maximumAmount: number;
    description?: string;
    isActive?: boolean;
    targetBrandId?: number;
    targetCategoryId?: string;
  }) {
    return this.prisma.creditPlan.create({ data });
  }

  async updatePlan(id: string, data: {
    name?: string;
    duration?: number;
    interestRate?: number;
    minimumAmount?: number;
    maximumAmount?: number;
    description?: string;
    isActive?: boolean;
    targetBrandId?: number | null;
    targetCategoryId?: string | null;
  }) {
    return this.prisma.creditPlan.update({ where: { id }, data });
  }

  async deletePlan(id: string) {
    return this.prisma.creditPlan.delete({ where: { id } });
  }

  async getAccounts(userId: string) {
    return this.prisma.creditAccount.findMany({
      where: { userId },
      include: { 
        product: {
          include: { images: { where: { isPrimary: true } } }
        }, 
        creditPlan: true, 
        payments: true 
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllAccounts(params: { skip?: number; take?: number; status?: string }) {
    const { skip = 0, take: rawTake = 20, status } = params;
    const take = Math.min(Math.max(1, Number(rawTake) || 20), 100);
    const where: any = {};
    if (status) where.status = status;

    const [accounts, total] = await Promise.all([
      this.prisma.creditAccount.findMany({
        where,
        skip,
        take,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
          product: { select: { id: true, name: true, price: true } },
          creditPlan: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.creditAccount.count({ where }),
    ]);

    return { data: accounts, meta: { total, skip, take } };
  }

  async getCreditApplications(params: { skip?: number; take?: number; status?: string }) {
    const { skip = 0, take: rawTake = 20, status } = params;
    const take = Math.min(Math.max(1, Number(rawTake) || 20), 100);
    const where: any = {};
    if (status) where.status = status;

    const [applications, total] = await Promise.all([
      this.prisma.creditApplication.findMany({
        where,
        skip,
        take,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
          product: { select: { id: true, name: true, price: true } },
          creditPlan: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.creditApplication.count({ where }),
    ]);

    return { data: applications, meta: { total, skip, take } };
  }

  async updateApplicationStatus(id: string, status: string) {
    return this.prisma.creditApplication.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async getMyApplications(userId: string) {
    return this.prisma.creditApplication.findMany({
      where: { userId },
      include: {
        product: { select: { id: true, name: true, price: true } },
        creditPlan: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateAccountStatus(id: string, status: string) {
    return this.prisma.creditAccount.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async calculateInstallment(amount: number, planId: string) {
    const plan = await this.prisma.creditPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Credit plan not found');
    
    const interest = Number(amount) * (Number(plan.interestRate) / 100);
    const totalPayable = Number(amount) + interest;
    const monthlyPayment = totalPayable / plan.duration;
    
    return { totalPayable, monthlyPayment, interest, plan };
  }

  async applyForCredit(userId: string, data: ApplyCreditDto) {
    const { productId, planId, amount, ...applicationDetails } = data;
    
    // Check product allows credit
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.allowCredit) {
      throw new NotFoundException('Product not found or credit not allowed for this product');
    }

    // Check credit profile
    const profile = await this.getProfile(userId);
    if (profile.status !== 'ACTIVE') {
      throw new Error('Credit profile is not active');
    }

    // Check available credit
    if (Number(profile.availableCredit) < amount) {
      throw new Error('Insufficient available credit');
    }

    const calculation = await this.calculateInstallment(amount, planId);
    
    const nextPaymentDate = new Date();
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

    return this.prisma.$transaction(async (tx) => {
      const application = await tx.creditApplication.create({
        data: {
          userId,
          productId,
          creditPlanId: planId,
          amount,
          status: 'PENDING',
          firstName: applicationDetails.firstName,
          lastName: applicationDetails.lastName,
          email: applicationDetails.email,
          phone: applicationDetails.phone,
          address: applicationDetails.address,
          city: applicationDetails.city,
          state: applicationDetails.state,
          country: applicationDetails.country,
          zipCode: applicationDetails.zipCode,
          employmentStatus: applicationDetails.employmentStatus,
          monthlyIncome: applicationDetails.monthlyIncome,
          employerName: applicationDetails.employerName,
          employerPhone: applicationDetails.employerPhone,
        },
      });

      // Update profile
      await tx.creditProfile.update({
        where: { id: profile.id },
        data: {
          availableCredit: { decrement: amount },
          usedCredit: { increment: amount },
        },
      });

      return application;
    });
  }
}
