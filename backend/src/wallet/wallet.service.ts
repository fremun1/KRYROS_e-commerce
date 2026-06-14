import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      wallet = await this.prisma.wallet.create({ data: { userId } });
    }
    return wallet;
  }

  async getTransactions(walletId: string) {
    return this.prisma.transaction.findMany({
      where: { walletId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listWallets(take = 50, skip = 0) {
    return this.prisma.wallet.findMany({
      take,
      skip,
      orderBy: { updatedAt: 'desc' },
      include: { user: true, transactions: { take: 1, orderBy: { createdAt: 'desc' } } },
    });
  }

  async listTransactions(take = 50, skip = 0) {
    return this.prisma.transaction.findMany({
      take,
      skip,
      orderBy: { createdAt: 'desc' },
      include: { wallet: { include: { user: true } } },
    });
  }
}
