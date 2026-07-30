import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class WishlistService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async getForUser(userId: string) {
    const items = await this.prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true } },
            brand: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return items;
  }

  async add(userId: string, productId: string) {
    const result = await this.prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      update: {},
      create: { userId, productId },
    });

    // Send notification to user
    try {
      const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { name: true } });
      if (product) {
        await this.notificationsService.sendToUser(
          userId,
          'Added to Wishlist ❤️',
          `You've added "${product.name}" to your wishlist.`,
          { type: 'WISHLIST_ADD', productId }
        );
      }
    } catch (error) {
      console.error('Failed to send wishlist notification:', error);
    }

    return result;
  }

  async remove(userId: string, productId: string) {
    return this.prisma.wishlistItem.delete({
      where: { userId_productId: { userId, productId } },
    });
  }
}
