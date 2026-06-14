import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto, UpdateReviewStatusDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  private readonly CACHE_TTL = 120000;

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(userId: string | null, data: CreateReviewDto) {
    let isVerified = false;

    // 1. If it's a registered user, check if they have a delivered order for this product
    if (userId) {
      const orderItem = await this.prisma.orderItem.findFirst({
        where: {
          productId: data.productId,
          order: {
            userId,
            status: 'DELIVERED',
          },
        },
      });

      // If they have a delivered order, mark as verified buyer
      if (orderItem) {
        isVerified = true;
      }
    } 
    // 2. If it's a guest with an order number, check for delivered order
    else if (data.orderNumber) {
      const orderItem = await this.prisma.orderItem.findFirst({
        where: {
          productId: data.productId,
          order: {
            orderNumber: data.orderNumber,
            status: 'DELIVERED',
          },
        },
      });

      if (orderItem) {
        isVerified = true;
      }
    }

    // 3. Create the review (Allowing all users to leave reviews)
    const review = await this.prisma.review.create({
      data: {
        productId: data.productId,
        userId: userId || undefined,
        rating: data.rating,
        comment: data.comment,
        imageUrl: data.imageUrl,
        isVerified: isVerified,
        isApproved: true,
      },
    });

    await this.updateProductStats(data.productId);

    return review;
  }

  async findAll(params: {
    productId?: string;
    isFeatured?: boolean;
    isApproved?: boolean;
    skip?: number;
    take?: number;
  }) {
    const { productId, isFeatured, isApproved, skip, take } = params;
    
    const where: any = {};
    if (productId) where.productId = productId;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;
    if (isApproved !== undefined) where.isApproved = isApproved;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip: skip || 0,
        take: take || 20,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          product: {
            select: {
              name: true,
              images: { where: { isPrimary: true }, take: 1 },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where }),
    ]);

    return { data: reviews, meta: { total, skip, take } };
  }

  async updateStatus(id: string, data: UpdateReviewStatusDto) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.prisma.review.update({
      where: { id },
      data,
    });

    await this.updateProductStats(review.productId);
    return updated;
  }

  async delete(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    const deleted = await this.prisma.review.delete({ where: { id } });
    await this.updateProductStats(review.productId);
    return deleted;
  }

  async getProductRating(productId: string) {
    const aggregate = await this.prisma.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      averageRating: aggregate._avg.rating || 0,
      totalReviews: aggregate._count.rating || 0,
    };
  }

  private async updateProductStats(productId: string) {
    const stats = await this.getProductRating(productId);
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        rating: stats.averageRating,
        reviewCount: stats.totalReviews,
      },
    });
  }
}
