import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private monthKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private dayKey(date: Date) {
    return `${this.monthKey(date)}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private formatMonthLabel(month: string) {
    const [year, monthNumber] = month.split('-').map(Number);
    return new Date(year, monthNumber - 1, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }

  private percentChange(current: number, previous: number) {
    if (!previous) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  private getRange(range: string, month?: string) {
    const now = new Date();

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, monthNumber] = month.split('-').map(Number);
      const start = new Date(year, monthNumber - 1, 1, 0, 0, 0, 0);
      const isCurrentMonth = this.monthKey(now) === month;
      const end = isCurrentMonth
        ? now
        : new Date(year, monthNumber, 0, 23, 59, 59, 999);
      return { start, end, selectedMonth: month, selectedLabel: this.formatMonthLabel(month), bucket: 'day' as const };
    }

    const start = new Date();
    let selectedLabel = 'This Month';
    let bucket: 'day' | 'month' = 'day';

    if (range === 'week') {
      start.setDate(now.getDate() - 7);
      selectedLabel = 'Last 7 Days';
    } else if (range === 'quarter') {
      start.setMonth(now.getMonth() - 3);
      selectedLabel = 'Last 3 Months';
      bucket = 'month';
    } else if (range === 'year') {
      start.setFullYear(now.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
      selectedLabel = String(now.getFullYear());
      bucket = 'month';
    } else {
      start.setFullYear(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
    }

    return {
      start,
      end: now,
      selectedMonth: this.monthKey(start),
      selectedLabel,
      bucket,
    };
  }

  private getPreviousMonthRange(selectedMonth: string) {
    const [year, monthNumber] = selectedMonth.split('-').map(Number);
    const start = new Date(year, monthNumber - 2, 1, 0, 0, 0, 0);
    const end = new Date(year, monthNumber - 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  async summary(range = 'month', month?: string) {
    const { start, end, selectedMonth, selectedLabel, bucket } = this.getRange(range, month);
    const previousMonthRange = this.getPreviousMonthRange(selectedMonth);

    const [orderStats, directStats, totalUsers, newCustomers, creditStats, previousOrderStats, previousDirectStats, previousCustomers] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: start, lte: end },
          paymentStatus: 'PAID', // Only count paid orders for revenue
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.directPayment.aggregate({
        where: {
          createdAt: { gte: start, lte: end },
          status: 'PAID',
        },
        _sum: { amount: true },
        _count: { id: true },
      }).catch(() => ({ _sum: { amount: 0 }, _count: { id: 0 } })),
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.creditAccount.aggregate({
        _sum: { amount: true, remainingAmount: true },
        _count: { id: true },
      }).catch(() => ({ _sum: { amount: 0, remainingAmount: 0 }, _count: { id: 0 } })),
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: previousMonthRange.start, lte: previousMonthRange.end },
          paymentStatus: 'PAID',
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.directPayment.aggregate({
        where: {
          createdAt: { gte: previousMonthRange.start, lte: previousMonthRange.end },
          status: 'PAID',
        },
        _sum: { amount: true },
        _count: { id: true },
      }).catch(() => ({ _sum: { amount: 0 }, _count: { id: 0 } })),
      this.prisma.user.count({
        where: {
          createdAt: { gte: previousMonthRange.start, lte: previousMonthRange.end },
        },
      }),
    ]);

    const totalRevenue = Number(orderStats._sum.total || 0) + Number(directStats._sum.amount || 0);
    const totalOrders = orderStats._count.id + directStats._count.id; // Count of paid orders + direct payments
    const activeUsers = totalUsers;
    const creditDisbursed = Number(creditStats._sum.amount || 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const previousRevenue = Number(previousOrderStats._sum.total || 0) + Number(previousDirectStats._sum.amount || 0);
    const previousOrders = previousOrderStats._count.id + previousDirectStats._count.id;
    const revenueGrowth = this.percentChange(totalRevenue, previousRevenue);
    const ordersGrowth = this.percentChange(totalOrders, previousOrders);
    const customersGrowth = this.percentChange(newCustomers, previousCustomers);

    const revenueGroups = await this.prisma.order.groupBy({
      by: ['createdAt'],
      where: { 
        createdAt: { gte: start, lte: end },
        paymentStatus: 'PAID', // Only count paid orders
      },
      _sum: { total: true },
      _count: { id: true },
    });

    const customerDates = await this.prisma.user.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      select: { createdAt: true },
    });

    const bucketMap: Record<string, { revenue: number; orders: number; customers: number; date: Date }> = {};
    for (const group of revenueGroups) {
      const date = group.createdAt;
      const key = bucket === 'month' ? this.monthKey(date) : this.dayKey(date);
      if (!bucketMap[key]) {
        bucketMap[key] = { revenue: 0, orders: 0, customers: 0, date };
      }
      bucketMap[key].revenue += Number(group._sum.total || 0);
      bucketMap[key].orders += group._count.id;
    }

    for (const customer of customerDates) {
      const date = customer.createdAt;
      const key = bucket === 'month' ? this.monthKey(date) : this.dayKey(date);
      if (!bucketMap[key]) {
        bucketMap[key] = { revenue: 0, orders: 0, customers: 0, date };
      }
      bucketMap[key].customers += 1;
    }

    const labels = Object.keys(bucketMap).sort();
    const revenueSeries = labels.map((key) => {
      const item = bucketMap[key];
      const label = bucket === 'month'
        ? item.date.toLocaleDateString('en-US', { month: 'short' })
        : item.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        key,
        label,
        revenue: item.revenue,
        orders: item.orders,
        customers: item.customers,
      };
    });

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

    const recentOrders = await this.prisma.order.findMany({
      where: {
        paymentStatus: 'PAID',
        createdAt: { gte: start, lte: end },
      },
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

    const availableOrderDates = await this.prisma.order.findMany({
      where: { paymentStatus: 'PAID' },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    const availableDirectDates = await this.prisma.directPayment.findMany({
      where: { status: 'PAID' },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []);

    const availableMonthKeys = new Set<string>([this.monthKey(new Date())]);
    for (const item of availableOrderDates) availableMonthKeys.add(this.monthKey(item.createdAt));
    for (const item of availableDirectDates) availableMonthKeys.add(this.monthKey(item.createdAt));

    const availableMonths = Array.from(availableMonthKeys)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((value) => ({
        value,
        label: this.formatMonthLabel(value),
      }));

    return {
      stats: {
        totalRevenue,
        totalOrders,
        activeUsers,
        totalCustomers: totalUsers,
        newCustomers,
        creditDisbursed,
        averageOrderValue,
        revenueGrowth,
        ordersGrowth,
        customersGrowth,
      },
      selectedMonth,
      selectedLabel,
      availableMonths,
      revenueSeries,
      topProducts,
      recentTransactions,
      credit,
      salesByCategory,
      note: `Revenue calculated from PAID orders only for ${selectedLabel}. Pending and failed orders are excluded.`,
    };
  }
}
