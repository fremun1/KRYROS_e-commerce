import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private getRange(range: string) {
    const now = new Date();
    const start = new Date();
    if (range === 'week') {
      start.setDate(now.getDate() - 7);
    } else if (range === 'month') {
      start.setMonth(now.getMonth() - 1);
    } else if (range === 'quarter') {
      start.setMonth(now.getMonth() - 3);
    } else {
      start.setFullYear(now.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
    }
    return { start, end: now };
  }

  async summary(range = 'year') {
    const { start, end } = this.getRange(range);

    const [orderStats, usersCount, creditStats] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: start, lte: end },
          paymentStatus: 'PAID', // Only count paid orders for revenue
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.user.count(),
      this.prisma.creditAccount.aggregate({
        _sum: { amount: true, remainingAmount: true },
        _count: { id: true },
      }).catch(() => ({ _sum: { amount: 0, remainingAmount: 0 }, _count: { id: 0 } })),
    ]);

    const totalRevenue = Number(orderStats._sum.total || 0);
    const totalOrders = orderStats._count.id; // Count of paid orders only
    const activeUsers = usersCount;
    const creditDisbursed = Number(creditStats._sum.amount || 0);

    // Group revenue by month using groupBy for efficiency
    // Only include PAID orders for accurate revenue tracking
    const revenueByMonth = await this.prisma.order.groupBy({
      by: ['createdAt'],
      where: { 
        createdAt: { gte: start, lte: end },
        paymentStatus: 'PAID', // Only count paid orders
      },
      _sum: { total: true },
      _count: { id: true },
    });

    const byMonth: Record<string, { revenue: number; orders: number }> = {};
    for (const group of revenueByMonth) {
      const date = group.createdAt;
      const k = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[k]) byMonth[k] = { revenue: 0, orders: 0 };
      byMonth[k].revenue += Number(group._sum.total || 0);
      byMonth[k].orders += group._count.id;
    }
    const labels = Object.keys(byMonth).sort();
    const revenueSeries = labels.map((k) => {
      const d = new Date(Number(k.split('-')[0]), Number(k.split('-')[1]) - 1, 1);
      const m = d.toLocaleString('en-US', { month: 'short' });
      return { label: m, revenue: byMonth[k].revenue, orders: byMonth[k].orders };
    });

    // Only include items from paid orders for accurate product/category revenue
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: start, lte: end },
          paymentStatus: 'PAID', // Only count items from paid orders
        },
      },
      include: { product: { select: { name: true, categoryId: true, category: { select: { name: true } } } } },
    });
    const productAgg: Record<string, { name: string; sales: number; revenue: number }> = {};
    const categoryAgg: Record<string, number> = {};
    for (const it of orderItems) {
      const key = it.product?.name || it.productId;
      if (!productAgg[key]) productAgg[key] = { name: key, sales: 0, revenue: 0 };
      productAgg[key].sales += it.quantity;
      productAgg[key].revenue += Number(it.total);
      const cat = it.product?.category?.name || 'Other';
      categoryAgg[cat] = (categoryAgg[cat] || 0) + Number(it.total);
    }
    const topProducts = Object.values(productAgg)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((p) => ({ ...p, growth: 0 }));
    const catTotal = Object.values(categoryAgg).reduce((a, b) => a + b, 0) || 1;
    const salesByCategory = Object.entries(categoryAgg).map(([name, val]) => ({
      name,
      value: Math.round((val / catTotal) * 100),
    }));

    // Show recent paid orders for transaction history
    const recentOrders = await this.prisma.order.findMany({
      where: { paymentStatus: 'PAID' }, // Only show paid orders in recent transactions
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
    const recentTransactions = recentOrders.map((o) => ({
      id: o.orderNumber,
      customer: o.user ? `${o.user.firstName || ''} ${o.user.lastName || ''}`.trim() || o.user.email : 'Unknown',
      amount: Number(o.total),
      status: o.paymentStatus.toLowerCase(),
      date: o.createdAt.toISOString().slice(0, 10),
    }));

    const credit = {
      activeAccounts: creditStats._count.id,
      totalOutstanding: Number(creditStats._sum.remainingAmount || 0),
      repaymentRate: 0,
      defaultRate: 0, // Simplified for now since we don't have detailed credit status counts in the current aggregate
    };

    return {
      stats: { totalRevenue, totalOrders, activeUsers, creditDisbursed },
      revenueSeries,
      topProducts,
      recentTransactions,
      credit,
      salesByCategory,
      note: 'Revenue calculated from PAID orders only. Pending and failed orders are excluded.',
    };
  }
}
