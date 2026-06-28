import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { compressImage } from '../common/utils/image.util';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private async invalidateCategoryCache() {
    await Promise.all([
      this.cacheManager.del('categories:all'),
      this.cacheManager.del('categories:active'),
      this.cacheManager.del('categories:homepage'),
    ]);
  }

  private withAggregatedProductCounts(categories: any[]) {
    const childrenByParent = new Map<string, any[]>();

    for (const category of categories) {
      if (!category.parentId) continue;
      const siblings = childrenByParent.get(category.parentId) || [];
      siblings.push(category);
      childrenByParent.set(category.parentId, siblings);
    }

    const memo = new Map<string, number>();
    const countProducts = (categoryId: string): number => {
      if (memo.has(categoryId)) {
        return memo.get(categoryId)!;
      }

      const category = categories.find((item) => item.id === categoryId);
      const ownCount = category?._count?.products ?? 0;
      const childCount = (childrenByParent.get(categoryId) || []).reduce(
        (sum, child) => sum + countProducts(child.id),
        0,
      );
      const total = ownCount + childCount;
      memo.set(categoryId, total);
      return total;
    };

    return categories.map((category) => ({
      ...category,
      _count: {
        ...category._count,
        products: countProducts(category.id),
      },
    }));
  }

  private async getCategoriesWithCounts() {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        children: {
          where: { isActive: true },
          select: { id: true, name: true, slug: true, parentId: true },
        },
        _count: {
          select: { products: { where: { isActive: true } } }
        }
      },
      orderBy: { sortOrder: 'asc' },
    });

    return this.withAggregatedProductCounts(categories);
  }

  async findAll() {
    const cached = await this.cacheManager.get<any[]>('categories:all');
    if (cached) return cached;

    const result = await this.getCategoriesWithCounts();
    await this.cacheManager.set('categories:all', result, CACHE_TTL);
    return result;
  }

  async findAllActive() {
    const cached = await this.cacheManager.get<any[]>('categories:active');
    if (cached) return cached;

    const result = await this.prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        icon: true,
        description: true,
        sortOrder: true,
        showOnHome: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
    await this.cacheManager.set('categories:active', result, CACHE_TTL);
    return result;
  }

  async getHomepageCategories() {
    const cached = await this.cacheManager.get<any[]>('categories:homepage');
    if (cached) return cached;

    const result = (await this.getCategoriesWithCounts()).filter(
      (category) => category.showOnHome,
    );
    await this.cacheManager.set('categories:homepage', result, CACHE_TTL);
    return result;
  }

  async findById(id: string) {
    return this.prisma.category.findUnique({
      where: { id },
      include: { children: true, products: { take: 10 } },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.category.findUnique({
      where: { slug },
      include: { children: true, products: { take: 10 } },
    });
  }

  async create(data: any) {
    if (data.image) {
      data.image = await compressImage(data.image, 400, 400, 60);
    }
    // Map DTO field name (showOnHomepage) → Prisma field name (showOnHome)
    const { showOnHomepage, ...rest } = data;
    const prismaData: any = {
      ...rest,
      slug: rest.slug || rest.name.toLowerCase().replace(/\s+/g, '-'),
      ...(showOnHomepage !== undefined && { showOnHome: showOnHomepage }),
    };
    const result = await this.prisma.category.create({ data: prismaData });
    await this.invalidateCategoryCache();
    return result;
  }

  async update(id: string, data: any) {
    if (data.image) {
      data.image = await compressImage(data.image, 400, 400, 60);
    }
    // Map DTO field name (showOnHomepage) → Prisma field name (showOnHome)
    const { showOnHomepage, ...rest } = data;
    const prismaData: any = {
      ...rest,
      ...(showOnHomepage !== undefined && { showOnHome: showOnHomepage }),
    };
    const result = await this.prisma.category.update({
      where: { id },
      data: prismaData,
    });
    await this.invalidateCategoryCache();
    return result;
  }

  async delete(id: string) {
    // Soft delete — preserves products/children/brands referencing this category
    const result = await this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
    await this.invalidateCategoryCache();
    return result;
  }
}
