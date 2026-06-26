import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductFlagsDto } from './dto/update-product-flags.dto';
import { Prisma } from '@prisma/client';
import type { Express } from 'express';
import { compressImage, compressBuffer } from '../common/utils/image.util';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAll(params: {
    skip?: number;
    take?: number;
    categoryId?: string;
    categorySlug?: string;
    search?: string;
    isFeatured?: boolean;
    allowCredit?: boolean;
    isWholesaleOnly?: boolean;
    isFlashSale?: boolean;
    showInactive?: boolean;
    popularity?: string;
  }) {
    const { skip = 0, take: rawTake = 20, categoryId, categorySlug, search, isFeatured, allowCredit, isWholesaleOnly, isFlashSale, showInactive, popularity } = params;
    const take = Math.min(Math.max(1, Number(rawTake) || 20), 500);
    
    const where: any = {};
    if (!showInactive) {
      where.isActive = true;
    }
    
    if (categoryId) where.categoryId = categoryId;
    if (categorySlug) {
      where.category = { slug: categorySlug };
    }
    
    // Use an AND array to combine all boolean filters cleanly
    const andFilters: any[] = [];
    
    if (isFeatured !== undefined) andFilters.push({ isFeatured });
    if (isFlashSale !== undefined) andFilters.push({ isFlashSale });
    if (allowCredit !== undefined) andFilters.push({ allowCredit });
    if (isWholesaleOnly !== undefined) andFilters.push({ isWholesaleOnly });
    if (!showInactive) andFilters.push({ isActive: true });



    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (popularity === 'sale' || popularity === 'promotion prices') {
      const saleFilter = {
        OR: [
          { salePrice: { not: null, gt: 0 } },
          { isFlashSale: true }
        ]
      };
      if (where.AND) {
        (where.AND as any[]).push(saleFilter);
      } else {
        where.AND = [saleFilter];
      }
    }

    let orderBy: any = { createdAt: 'desc' };
    
    if (params.popularity === 'trending') {
      orderBy = [
        { orderItems: { _count: 'desc' } },
        { wishlists: { _count: 'desc' } },
        { createdAt: 'desc' }
      ];
    } else if (popularity === 'bestseller') {
      orderBy = { orderItems: { _count: 'desc' } };
    } else if (popularity === 'hot') {
      orderBy = { wishlists: { _count: 'desc' } };
    } else if (popularity === 'new') {
      orderBy = { createdAt: 'desc' };
    }

    const sanitizeProducts = (products: any[]) => products.map((p) => {
      const product = p as any;
      return {
        ...product,
        price: product.price ? Number(product.price) : 0,
        salePrice: product.salePrice ? Number(product.salePrice) : null,
        flashSalePrice: product.flashSalePrice ? Number(product.flashSalePrice) : null,
        wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : null,
        isBestSeller: product.isBestSeller || (product._count?.orderItems || 0) > 5,
        isHot: product.isHot || (product._count?.wishlists || 0) > 5,
        isTrending: product.isTrending || (product._count?.orderItems || 0) > 3,
        variants: (product.variants || []).map((v: any) => ({
          ...v,
          price: v.price ? Number(v.price) : null,
        })),
      };
    });

    try {
      const [products, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          skip,
          take,
          include: {
            category: { select: { id: true, name: true, slug: true } },
            brand: { select: { id: true, name: true, slug: true } },
            images: {
              orderBy: { sortOrder: 'asc' },
              take: 1,
              select: { url: true }
            },
            inventory: true,
            variants: {
              select: { id: true, type: true, value: true, price: true, stock: true }
            },
            _count: {
              select: { orderItems: true, wishlists: true }
            },
            productRelations: {
              take: 1,
              select: { relatedId: true }
            }
          },
          orderBy,
        }),
        this.prisma.product.count({ where }),
      ]);

      return { data: sanitizeProducts(products), meta: { total, skip, take } };
    } catch (error: any) {
      this.logger.error(`Full product query failed, retrying with fallback query: ${error?.message || error}`);

      try {
        const [products, total] = await Promise.all([
          this.prisma.product.findMany({
            where,
            skip,
            take,
            include: {
              category: { select: { id: true, name: true, slug: true } },
              brand: { select: { id: true, name: true, slug: true } },
              images: {
                orderBy: { sortOrder: 'asc' },
                take: 1,
                select: { url: true }
              },
              inventory: true,
            },
            orderBy: { createdAt: 'desc' },
          }),
          this.prisma.product.count({ where }),
        ]);

        this.logger.warn('Returned products using fallback query without counts, variants, or relations.');
        return { data: sanitizeProducts(products), meta: { total, skip, take, degraded: true } };
      } catch (fallbackError: any) {
        this.logger.error(`Fallback product query also failed: ${fallbackError?.message || fallbackError}`);
        return { data: [], meta: { total: 0, skip, take } };
      }
    }
  }

  async resetCreditFlags() {
    return this.prisma.product.updateMany({
      data: {
        allowCredit: false,
        creditMinimum: 0,
      },
    });
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
        inventory: true,
        reviews: { take: 10, orderBy: { createdAt: 'desc' } },
        productRelations: {
          include: { related: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } } } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        brand: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
        inventory: true,
        productRelations: {
          include: { related: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } } } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async getFeaturedProducts(take = 10) {
    return this.prisma.product.findMany({
      where: { 
        isFeatured: true, 
        isActive: true,
        isWholesaleOnly: false,
        allowCredit: false
      },
      take,
      include: {
        category: true,
        brand: true,
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        inventory: true,
        productRelations: {
          include: { related: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFlashSaleProducts() {
    const now = new Date();
    return this.prisma.product.findMany({
      where: {
        isFlashSale: true,
        isActive: true,
        isWholesaleOnly: false,
        allowCredit: false,
        flashSaleEnd: { gt: now },
      },
      include: {
        category: true,
        brand: true,
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        inventory: true,
        productRelations: {
          include: { related: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } } } },
      },
    });
  }

  async getGroupedProducts(isFeatured?: boolean, allowCredit?: boolean) {
    const products = await this.prisma.product.findMany({
      where: { 
        isActive: true,
        isWholesaleOnly: false,
        ...(allowCredit !== undefined ? { allowCredit } : {}),
        ...(isFeatured !== undefined ? { isFeatured } : {}),
      },
      include: { 
        images: true, 
        category: true, 
        brand: true,
        inventory: true,
        productRelations: {
          include: { related: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } } } },
      },
      orderBy: [
        { category: { name: 'asc' } },
        { brand: { name: 'asc' } },
        { name: 'asc' }
      ]
    });

    const grouped: any[] = [];

    products.forEach(product => {
      const category = product.category;
      const brand = (product as any).brand || { id: 0, name: 'Other', slug: 'other' };

      let categoryGroup = grouped.find(g => g.id === category.id);
      if (!categoryGroup) {
        categoryGroup = {
          id: category.id,
          name: category.name,
          slug: category.slug,
          brands: []
        };
        grouped.push(categoryGroup);
      }

      let brandGroup = categoryGroup.brands.find((b: any) => b.id === brand.id);
      if (!brandGroup) {
        brandGroup = {
          id: brand.id,
          name: brand.name,
          slug: brand.slug,
          products: []
        };
        categoryGroup.brands.push(brandGroup);
      }

      brandGroup.products.push(product);
    });

    return grouped;
  }

  private toSlug(input: string) {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async create(dto: CreateProductDto) {
    try {
      // Validate name
      if (!dto.name || !dto.name.trim()) {
        throw new Error('Product name is required');
      }

      const name = dto.name.trim();
      const baseSlug = this.toSlug(name) || 'product';
      let slug = baseSlug;
      let i = 2;
      while (await this.prisma.product.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${i++}`;
      }

      const categorySlug = dto.categorySlug?.trim().toLowerCase() || 'general';
      const brandSlug = dto.brandSlug?.trim().toLowerCase();

      const category = await this.prisma.category.upsert({
        where: { slug: categorySlug },
        update: {},
        create: { 
          name: categorySlug === 'general' ? 'General' : categorySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), 
          slug: categorySlug, 
          isActive: true 
        },
      });

      let brandId: number | undefined = dto.brandId ? Number(dto.brandId) : undefined;
      if (isNaN(brandId as number)) brandId = undefined;

      if (!brandId && brandSlug && brandSlug !== 'select brand') {
        const brand = await this.prisma.brand.upsert({
          where: { slug: brandSlug },
          update: {},
          create: { name: brandSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), slug: brandSlug },
        });
        brandId = brand.id;
      }

      const product = await this.prisma.product.create({
        data: {
          name,
          slug,
          description: dto.description || name,
          shortDescription: dto.shortDescription || dto.description || name,
          price: isNaN(Number(dto.price)) ? 0 : Number(dto.price),
          sku: dto.sku || `SKU-${Date.now()}`,
          weight: dto.weight !== undefined && dto.weight !== null ? (isNaN(Number(dto.weight)) ? null : Number(dto.weight)) : null,
          categoryId: category.id,
          brandId: brandId || null,
          isActive: dto.isActive === false ? false : true,
          isFeatured: dto.isFeatured === true,
          // Ensure mutual exclusivity
          allowCredit: dto.allowCredit === true && dto.isWholesaleOnly !== true,
          isWholesaleOnly: dto.isWholesaleOnly === true,
          creditMinimum: dto.creditMinimum ? Number(dto.creditMinimum) : null,
          creditMessage: dto.creditMessage ?? null,
          deliveryInfo: dto.deliveryInfo ?? null,
          warrantyInfo: dto.warrantyInfo ?? null,
          isNew: dto.isNew === false ? false : true,
          discountPercentage: dto.discountPercentage ? Number(dto.discountPercentage) : null,
          stockTotal: isNaN(Number(dto.stockTotal)) ? 0 : Number(dto.stockTotal),
          stockCurrent: isNaN(Number(dto.stockCurrent)) ? 0 : Number(dto.stockCurrent),
          hasFiveYearGuarantee: dto.hasFiveYearGuarantee === true,
          fiveYearGuaranteeText: dto.fiveYearGuaranteeText ?? null,
          hasFreeReturns: dto.hasFreeReturns === true,
          freeReturnsText: dto.freeReturnsText ?? null,
          hasInstallmentOptions: dto.hasInstallmentOptions === true,
          installmentOptionsText: dto.installmentOptionsText ?? null,
          fullyTested: dto.fullyTested !== false,
          fullyTestedText: dto.fullyTestedText ?? null,
          rating: dto.rating ? Number(dto.rating) : 0,
          reviewCount: dto.reviewCount ? Number(dto.reviewCount) : 0,
          wholesalePrice: dto.wholesalePrice ? Number(dto.wholesalePrice) : null,
          unitsPerPack: dto.unitsPerPack ? Number(dto.unitsPerPack) : 1,
          wholesaleMoq: dto.wholesaleMoq ? Number(dto.wholesaleMoq) : 1,
          specifications: dto.specifications ? (typeof dto.specifications === 'string' ? dto.specifications : JSON.stringify(dto.specifications)) : null,
          isFlashSale: dto.isFlashSale === true,
          flashSalePrice: dto.flashSalePrice ? Number(dto.flashSalePrice) : null,
          flashSaleEnd: (dto.flashSaleEnd && dto.flashSaleEnd.trim() && !isNaN(new Date(dto.flashSaleEnd).getTime())) ? new Date(dto.flashSaleEnd) : null,
          // New fields
          condition: dto.condition ?? 'New',
          shippingFee: dto.shippingFee ? Number(dto.shippingFee) : null,
          freeReturnsDescription: dto.freeReturnsDescription ?? null,
          protectionDescription: dto.protectionDescription ?? null,
          estimatedDeliveryDays: dto.estimatedDeliveryDays ? Number(dto.estimatedDeliveryDays) : 3,
          estimatedDeliveryMinDays: dto.estimatedDeliveryMinDays ? Number(dto.estimatedDeliveryMinDays) : 2,
          estimatedDeliveryMaxDays: dto.estimatedDeliveryMaxDays ? Number(dto.estimatedDeliveryMaxDays) : 7,
          popularItemText: dto.popularItemText ?? null,
          easyReturnsText: dto.easyReturnsText ?? null,
          variants: {
            create: Array.isArray(dto.variants) ? dto.variants.map(v => ({
              name: v.value,
              type: v.type as any,
              value: v.value,
              price: isNaN(Number(v.price)) ? 0 : Number(v.price),
              stock: isNaN(Number(v.stock)) ? 0 : Number(v.stock),
              sku: v.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            })) : []
          }
        },
      });

      // Handle upsell product relation with safety check
      if (dto.upsellProductId && dto.upsellProductId.trim()) {
        try {
          const relatedExists = await this.prisma.product.findUnique({ where: { id: dto.upsellProductId } });
          if (relatedExists) {
            await this.prisma.productRelation.create({
              data: {
                productId: product.id,
                relatedId: String(dto.upsellProductId),
                relationType: 'upsell',
              },
            });
          }
        } catch {
          // Upsell relation failure is non-fatal
        }
      }

      const imgs = Array.isArray(dto.imageDataUrls) ? dto.imageDataUrls : [];
      for (let idx = 0; idx < imgs.length; idx++) {
        const rawUrl = imgs[idx];
        if (typeof rawUrl !== 'string' || !rawUrl.trim()) continue;

        let url: string;
        if (rawUrl.startsWith('data:image')) {
          url = await compressImage(rawUrl);
        } else if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
          url = rawUrl; // Cloudinary / hosted URL — save directly
        } else {
          continue;
        }
        await this.prisma.productImage.create({
          data: {
            productId: product.id,
            url,
            alt: product.name,
            isPrimary: idx === 0,
            sortOrder: idx,
          },
        }).catch(() => null);
      }

      await this.prisma.inventory.create({
        data: {
          productId: product.id,
          stock: isNaN(Number(dto.stockCurrent)) ? 0 : Number(dto.stockCurrent),
          reservedStock: 0,
        },
      }).catch(() => null);

      return this.findById(product.id);
    } catch (error) {
      throw error;
    }
  }

  async createWithFiles(dto: CreateProductDto, files: Express.Multer.File[]) {
    try {
      // Validate name
      if (!dto.name || !dto.name.trim()) {
        throw new Error('Product name is required');
      }

      const name = dto.name.trim();
      const baseSlug = this.toSlug(name) || 'product';
      let slug = baseSlug;
      let i = 2;
      while (await this.prisma.product.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${i++}`;
      }

      const categorySlug = dto.categorySlug?.trim().toLowerCase() || 'general';
      const brandSlug = dto.brandSlug?.trim().toLowerCase();

      const category = await this.prisma.category.upsert({
        where: { slug: categorySlug },
        update: {},
        create: { 
          name: categorySlug === 'general' ? 'General' : categorySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), 
          slug: categorySlug, 
          isActive: true 
        },
      });

      let brandId: number | undefined = dto.brandId ? Number(dto.brandId) : undefined;
      if (isNaN(brandId as number)) brandId = undefined;

      if (!brandId && brandSlug && brandSlug !== 'select brand') {
        const brand = await this.prisma.brand.upsert({
          where: { slug: brandSlug },
          update: {},
          create: { name: brandSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), slug: brandSlug },
        });
        brandId = brand.id;
      }

      const product = await this.prisma.product.create({
        data: {
          name,
          slug,
          description: dto.description || name,
          shortDescription: dto.shortDescription ?? dto.description ?? name,
          price: isNaN(Number(dto.price)) ? 0 : Number(dto.price),
          sku: dto.sku || `SKU-${Date.now()}`,
          weight: dto.weight !== undefined && dto.weight !== null ? (isNaN(Number(dto.weight)) ? null : Number(dto.weight)) : null,
          categoryId: category.id,
          brandId: brandId || null,
          isActive: dto.isActive === false ? false : true,
          isFeatured: dto.isFeatured === true,
          isFlashSale: dto.isFlashSale === true,
          isTrending: dto.isTrending === true,
          isHot: dto.isHot === true,
          isBestSeller: dto.isBestSeller === true,
          flashSalePrice: dto.flashSalePrice ? Number(dto.flashSalePrice) : null,
          flashSaleEnd: (dto.flashSaleEnd && dto.flashSaleEnd.trim() && !isNaN(new Date(dto.flashSaleEnd).getTime())) ? new Date(dto.flashSaleEnd) : null,
          // Ensure mutual exclusivity
          allowCredit: dto.allowCredit === true && dto.isWholesaleOnly !== true,
          isWholesaleOnly: dto.isWholesaleOnly === true,
          creditMinimum: dto.creditMinimum ? Number(dto.creditMinimum) : null,
          creditMessage: dto.creditMessage ?? null,
          deliveryInfo: dto.deliveryInfo ?? null,
          warrantyInfo: dto.warrantyInfo ?? null,
          isNew: dto.isNew === false ? false : true,
          discountPercentage: dto.discountPercentage ? Number(dto.discountPercentage) : null,
          stockTotal: isNaN(Number(dto.stockTotal)) ? 0 : Number(dto.stockTotal),
          stockCurrent: isNaN(Number(dto.stockCurrent)) ? 0 : Number(dto.stockCurrent),
          hasFiveYearGuarantee: dto.hasFiveYearGuarantee === true,
          fiveYearGuaranteeText: dto.fiveYearGuaranteeText ?? null,
          hasFreeReturns: dto.hasFreeReturns === true,
          freeReturnsText: dto.freeReturnsText ?? null,
          hasInstallmentOptions: dto.hasInstallmentOptions === true,
          installmentOptionsText: dto.installmentOptionsText ?? null,
          fullyTested: dto.fullyTested !== false,
          fullyTestedText: dto.fullyTestedText ?? null,
          rating: dto.rating ? Number(dto.rating) : 0,
          reviewCount: dto.reviewCount ? Number(dto.reviewCount) : 0,
          wholesalePrice: dto.wholesalePrice ? Number(dto.wholesalePrice) : null,
          unitsPerPack: dto.unitsPerPack ? Number(dto.unitsPerPack) : 1,
          wholesaleMoq: dto.wholesaleMoq ? Number(dto.wholesaleMoq) : 1,
          specifications: dto.specifications ? (typeof dto.specifications === 'string' ? dto.specifications : JSON.stringify(dto.specifications)) : null,
          // New fields
          condition: dto.condition ?? 'New',
          shippingFee: dto.shippingFee ? Number(dto.shippingFee) : null,
          freeReturnsDescription: dto.freeReturnsDescription ?? null,
          protectionDescription: dto.protectionDescription ?? null,
          estimatedDeliveryDays: dto.estimatedDeliveryDays ? Number(dto.estimatedDeliveryDays) : 3,
          estimatedDeliveryMinDays: dto.estimatedDeliveryMinDays ? Number(dto.estimatedDeliveryMinDays) : 2,
          estimatedDeliveryMaxDays: dto.estimatedDeliveryMaxDays ? Number(dto.estimatedDeliveryMaxDays) : 7,
          popularItemText: dto.popularItemText ?? null,
          easyReturnsText: dto.easyReturnsText ?? null,
          variants: {
            create: Array.isArray(dto.variants) ? dto.variants.map(v => ({
              name: v.value,
              type: v.type as any,
              value: v.value,
              price: isNaN(Number(v.price)) ? 0 : Number(v.price),
              stock: isNaN(Number(v.stock)) ? 0 : Number(v.stock),
              sku: v.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            })) : []
          }
        },
      });

      // Handle upsell product relation with safety check
      if (dto.upsellProductId && dto.upsellProductId.trim()) {
        try {
          const relatedExists = await this.prisma.product.findUnique({ where: { id: dto.upsellProductId } });
          if (relatedExists) {
            await this.prisma.productRelation.create({
              data: {
                productId: product.id,
                relatedId: String(dto.upsellProductId),
                relationType: 'upsell',
              },
            });
          }
        } catch {
          // Upsell relation failure is non-fatal
        }
      }

      for (let idx = 0; idx < files.length; idx++) {
        try {
          const f = files[idx];
          if (!f || !f.buffer || !f.mimetype) continue;

          const { dataUrl } = await compressBuffer(f.buffer);
          await this.prisma.productImage.create({
            data: {
              productId: product.id,
              url: dataUrl,
              alt: product.name,
              isPrimary: idx === 0,
              sortOrder: idx,
            },
          });
        } catch {
          // Image save failure is non-fatal
        }
      }

      await this.prisma.inventory.create({
        data: {
          productId: product.id,
          stock: isNaN(Number(dto.stockCurrent)) ? 0 : Number(dto.stockCurrent),
          reservedStock: 0,
        },
      }).catch(() => null);

      return this.findById(product.id);
    } catch (error) {
      throw error;
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');

    let slug: string | undefined = undefined;
    if (typeof dto.slug === 'string' && dto.slug.trim()) {
      const desired = this.toSlug(dto.slug);
      if (desired !== existing.slug) {
        let s = desired;
        let i = 2;
        while (await this.prisma.product.findUnique({ where: { slug: s } })) {
          s = `${desired}-${i++}`;
        }
        slug = s;
      }
    } else if (typeof dto.name === 'string' && dto.name.trim()) {
      const desired = this.toSlug(dto.name);
      if (desired !== existing.slug) {
        let s = desired;
        let i = 2;
        while (await this.prisma.product.findUnique({ where: { slug: s } })) {
          s = `${desired}-${i++}`;
        }
        slug = s;
      }
    }

    let categoryId: string | undefined;
    if (typeof dto.categorySlug === 'string' && dto.categorySlug.trim()) {
      const cslug = dto.categorySlug.trim().toLowerCase();
      const cat = await this.prisma.category.upsert({
        where: { slug: cslug },
        update: {},
        create: { name: cslug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), slug: cslug, isActive: true },
      });
      categoryId = cat.id;
    }
    let brandId: number | null | undefined = dto.brandId ? Number(dto.brandId) : undefined;
    if (brandId !== undefined && isNaN(brandId as number)) brandId = undefined;

    if (brandId === undefined && dto.brandSlug !== undefined) {
      const bslug = (dto.brandSlug || '').trim().toLowerCase();
      if (bslug) {
        const brand = await this.prisma.brand.upsert({
          where: { slug: bslug },
          update: {},
          create: { name: bslug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), slug: bslug },
        });
        brandId = brand.id;
      } else {
        brandId = null;
      }
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name?.trim() || undefined,
        slug: slug ?? undefined,
        description: dto.description ?? undefined,
        shortDescription: dto.shortDescription ?? undefined,
        price: dto.price !== undefined ? (isNaN(Number(dto.price)) ? 0 : Number(dto.price)) : undefined,
        salePrice: dto.salePrice !== undefined ? (isNaN(Number(dto.salePrice)) ? null : Number(dto.salePrice)) : undefined,
        sku: dto.sku?.trim() || undefined,
        weight: dto.weight !== undefined && dto.weight !== null ? (isNaN(Number(dto.weight)) ? null : Number(dto.weight)) : undefined,
        metaTitle: dto.metaTitle !== undefined ? dto.metaTitle : undefined,
        metaDescription: dto.metaDescription !== undefined ? dto.metaDescription : undefined,
        isActive: typeof dto.isActive === 'boolean' ? dto.isActive : undefined,
        isFeatured: typeof dto.isFeatured === 'boolean' ? dto.isFeatured : undefined,
        isFlashSale: typeof dto.isFlashSale === 'boolean' ? dto.isFlashSale : undefined,
        isTrending: typeof dto.isTrending === 'boolean' ? dto.isTrending : undefined,
        isHot: typeof dto.isHot === 'boolean' ? dto.isHot : undefined,
        isBestSeller: typeof dto.isBestSeller === 'boolean' ? dto.isBestSeller : undefined,
        flashSalePrice: dto.flashSalePrice !== undefined ? (isNaN(Number(dto.flashSalePrice)) ? null : Number(dto.flashSalePrice)) : undefined,
        flashSaleEnd: (dto.flashSaleEnd && dto.flashSaleEnd.trim() && !isNaN(new Date(dto.flashSaleEnd).getTime())) ? new Date(dto.flashSaleEnd) : (dto.flashSaleEnd === null || dto.flashSaleEnd === "" ? null : undefined),
        // Mutual exclusivity logic for updates
        allowCredit: dto.allowCredit === true ? true : (dto.isWholesaleOnly === true ? false : (typeof dto.allowCredit === 'boolean' ? dto.allowCredit : undefined)),
        isWholesaleOnly: dto.isWholesaleOnly === true ? true : (dto.allowCredit === true ? false : (typeof dto.isWholesaleOnly === 'boolean' ? dto.isWholesaleOnly : undefined)),
        creditMinimum: dto.creditMinimum !== undefined ? (isNaN(Number(dto.creditMinimum)) ? 0 : Number(dto.creditMinimum)) : undefined,
        creditMessage: dto.creditMessage !== undefined ? dto.creditMessage : undefined,
        deliveryInfo: dto.deliveryInfo !== undefined ? dto.deliveryInfo : undefined,
        warrantyInfo: dto.warrantyInfo !== undefined ? dto.warrantyInfo : undefined,
        isNew: typeof dto.isNew === 'boolean' ? dto.isNew : undefined,
        discountPercentage: dto.discountPercentage !== undefined ? (isNaN(Number(dto.discountPercentage)) ? 0 : Number(dto.discountPercentage)) : undefined,
        stockTotal: dto.stockTotal !== undefined ? (isNaN(Number(dto.stockTotal)) ? 0 : Number(dto.stockTotal)) : undefined,
        stockCurrent: dto.stockCurrent !== undefined ? (isNaN(Number(dto.stockCurrent)) ? 0 : Number(dto.stockCurrent)) : undefined,
        hasFiveYearGuarantee: typeof dto.hasFiveYearGuarantee === 'boolean' ? dto.hasFiveYearGuarantee : undefined,
        fiveYearGuaranteeText: dto.fiveYearGuaranteeText !== undefined ? dto.fiveYearGuaranteeText : undefined,
        hasFreeReturns: typeof dto.hasFreeReturns === 'boolean' ? dto.hasFreeReturns : undefined,
        freeReturnsText: dto.freeReturnsText !== undefined ? dto.freeReturnsText : undefined,
        hasInstallmentOptions: typeof dto.hasInstallmentOptions === 'boolean' ? dto.hasInstallmentOptions : undefined,
        installmentOptionsText: dto.installmentOptionsText !== undefined ? dto.installmentOptionsText : undefined,
        fullyTested: typeof dto.fullyTested === 'boolean' ? dto.fullyTested : undefined,
        fullyTestedText: dto.fullyTestedText !== undefined ? dto.fullyTestedText : undefined,
        rating: dto.rating !== undefined ? (isNaN(Number(dto.rating)) ? 0 : Number(dto.rating)) : undefined,
        reviewCount: dto.reviewCount !== undefined ? (isNaN(Number(dto.reviewCount)) ? 0 : Number(dto.reviewCount)) : undefined,
        wholesalePrice: dto.wholesalePrice !== undefined ? (isNaN(Number(dto.wholesalePrice)) ? null : Number(dto.wholesalePrice)) : undefined,
        unitsPerPack: dto.unitsPerPack !== undefined ? (isNaN(Number(dto.unitsPerPack)) ? 1 : Number(dto.unitsPerPack)) : undefined,
        wholesaleMoq: dto.wholesaleMoq !== undefined ? (isNaN(Number(dto.wholesaleMoq)) ? 1 : Number(dto.wholesaleMoq)) : undefined,
        categoryId: categoryId ?? undefined,
        brandId: brandId,
        specifications: dto.specifications ? (typeof dto.specifications === 'string' ? dto.specifications : JSON.stringify(dto.specifications)) : undefined,
        // New fields
        condition: dto.condition !== undefined ? dto.condition : undefined,
        shippingFee: dto.shippingFee !== undefined ? (isNaN(Number(dto.shippingFee)) ? null : Number(dto.shippingFee)) : undefined,
        estimatedDeliveryDays: dto.estimatedDeliveryDays !== undefined ? (isNaN(Number(dto.estimatedDeliveryDays)) ? 3 : Number(dto.estimatedDeliveryDays)) : undefined,
        estimatedDeliveryMinDays: dto.estimatedDeliveryMinDays !== undefined ? (isNaN(Number(dto.estimatedDeliveryMinDays)) ? 2 : Number(dto.estimatedDeliveryMinDays)) : undefined,
        estimatedDeliveryMaxDays: dto.estimatedDeliveryMaxDays !== undefined ? (isNaN(Number(dto.estimatedDeliveryMaxDays)) ? 7 : Number(dto.estimatedDeliveryMaxDays)) : undefined,
        popularItemText: dto.popularItemText !== undefined ? dto.popularItemText : undefined,
        easyReturnsText: dto.easyReturnsText !== undefined ? dto.easyReturnsText : undefined,
        freeReturnsDescription: dto.freeReturnsDescription !== undefined ? dto.freeReturnsDescription : undefined,
        protectionDescription: dto.protectionDescription !== undefined ? dto.protectionDescription : undefined,
        variants: Array.isArray(dto.variants) ? {
          deleteMany: {},
          create: dto.variants.map(v => ({
            name: v.value,
            type: v.type as any,
            value: v.value,
            price: isNaN(Number(v.price)) ? 0 : Number(v.price),
            stock: isNaN(Number(v.stock)) ? 0 : Number(v.stock),
            sku: v.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          }))
        } : undefined,
      },
    });

    // Sync inventory.stock whenever stockCurrent is updated (keeps "In Stock" display accurate)
    if (dto.stockCurrent !== undefined) {
      await this.prisma.inventory.upsert({
        where: { productId: id },
        update: { stock: isNaN(Number(dto.stockCurrent)) ? 0 : Number(dto.stockCurrent) },
        create: { productId: id, stock: isNaN(Number(dto.stockCurrent)) ? 0 : Number(dto.stockCurrent), reservedStock: 0 },
      }).catch(() => null);
    }

    if (dto.upsellProductId !== undefined) {
      try {
        // Clear existing upsells
        await this.prisma.productRelation.deleteMany({
          where: { productId: id, relationType: 'upsell' },
        });

        // Add new one if it's not an empty string and product exists
        if (dto.upsellProductId && dto.upsellProductId.trim()) {
          const relatedExists = await this.prisma.product.findUnique({ where: { id: dto.upsellProductId } });
          if (relatedExists) {
            await this.prisma.productRelation.create({
              data: {
                productId: id,
                relatedId: String(dto.upsellProductId),
                relationType: 'upsell',
              },
            });
          }
        }
      } catch {
        // Upsell relation failure is non-fatal
      }
    }

    if (Array.isArray(dto.imageDataUrls)) {
      try {
        if (dto.replaceImages !== false) {
          await this.prisma.productImage.deleteMany({ where: { productId: id } });
        }
        for (let idx = 0; idx < dto.imageDataUrls.length; idx++) {
          const rawUrl = dto.imageDataUrls[idx];
          if (typeof rawUrl !== 'string' || !rawUrl.trim()) continue;

          let url: string;
          if (rawUrl.startsWith('data:image')) {
            url = await compressImage(rawUrl);
          } else if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
            url = rawUrl; // Cloudinary / hosted URL — save directly
          } else {
            continue;
          }
          await this.prisma.productImage.create({
            data: {
              productId: id,
              url,
              alt: updated.name,
              isPrimary: idx === 0,
              sortOrder: idx,
            },
          });
        }
      } catch {
        // Image update failure is non-fatal
      }
    }

    await this.cacheManager.reset();
    return this.findById(id);
  }

  async updateWithFiles(id: string, dto: UpdateProductDto, files: Express.Multer.File[]) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');

    const res = await this.update(id, dto);

    if (Array.isArray(files) && files.length > 0) {
      if (dto.replaceImages !== false) {
        await this.prisma.productImage.deleteMany({ where: { productId: id } });
      }
      for (let idx = 0; idx < files.length; idx++) {
        try {
          const f = files[idx];
          if (!f || !f.buffer || !f.mimetype) continue;
          const dataUrl = `data:${f.mimetype};base64,${f.buffer.toString('base64')}`;
          await this.prisma.productImage.create({
            data: {
              productId: id,
              url: dataUrl,
              alt: res.name,
              isPrimary: idx === 0,
              sortOrder: idx,
            },
          });
        } catch {
          // Image save failure is non-fatal
        }
      }
    }

    return this.findById(id);
  }

  async remove(id: string) {
    try {
      await this.prisma.product.delete({ where: { id } });
      await this.cacheManager.reset();
      return { success: true, id };
    } catch (e: any) {
      // Fallback to soft delete if constrained by foreign keys
      await this.prisma.product.update({ where: { id }, data: { isActive: false } });
      await this.cacheManager.reset();
      return { success: true, id, softDeleted: true };
    }
  }

  async updateFlags(
    id: string,
    dto: {
      isFeatured?: boolean;
      isFlashSale?: boolean;
      isTrending?: boolean;
      isHot?: boolean;
      isBestSeller?: boolean;
      flashSaleEnd?: string | null;
      flashSalePrice?: number | null;
      allowCredit?: boolean;
    },
  ) {
    let flashSaleEndValue: Date | null | undefined = undefined;
    let flashSalePriceValue: number | undefined = undefined;

    if (dto.isFlashSale === true) {
      const now = new Date();
      const end = dto.flashSaleEnd;
      const desiredEnd = (end && !isNaN(new Date(end).getTime())) ? new Date(end) : new Date(now.getTime() + 48 * 60 * 60 * 1000);
      flashSaleEndValue = desiredEnd > now ? desiredEnd : new Date(now.getTime() + 48 * 60 * 60 * 1000);
      flashSalePriceValue = (dto.flashSalePrice !== undefined && dto.flashSalePrice !== null) ? (isNaN(Number(dto.flashSalePrice)) ? undefined : Number(dto.flashSalePrice)) : undefined;
    } else if (dto.isFlashSale === false) {
      flashSaleEndValue = null;
      flashSalePriceValue = undefined;
    }

    const result = await this.prisma.product.update({
      where: { id: id },
      data: {
        isFeatured: dto.isFeatured ?? undefined,
        isFlashSale: dto.isFlashSale ?? undefined,
        isTrending: dto.isTrending ?? undefined,
        isHot: dto.isHot ?? undefined,
        isBestSeller: dto.isBestSeller ?? undefined,
        allowCredit: dto.allowCredit ?? undefined,
        flashSaleEnd: flashSaleEndValue,
        flashSalePrice: flashSalePriceValue,
      },
    });
    return result;
  }

  async seedSampleProducts() {
    const category = await this.prisma.category.upsert({
      where: { slug: 'general' },
      update: {},
      create: { name: 'General', slug: 'general', isActive: true, sortOrder: 0 },
    });

    const brand = await this.prisma.brand.upsert({
      where: { slug: 'kryros' },
      update: {},
      create: { name: 'Kryros', slug: 'kryros' },
    });

    const samples = [
      {
        name: 'iPhone 13 Pro',
        slug: 'iphone-13-pro',
        description: 'Apple iPhone 13 Pro with A15 Bionic and ProMotion display.',
        price: 18500,
        sku: 'IP13PRO-256-GRY',
        isFeatured: true,
        image: 'https://images.unsplash.com/photo-1632633178775-8b3083a0b20e?w=1200',
      },
      {
        name: 'HP EliteBook x360 G8',
        slug: 'hp-elitebook-x360-g8',
        description: 'Premium business convertible with powerful performance.',
        price: 22000,
        sku: 'HP-EBX360-G8',
        isFeatured: true,
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200',
      },
      {
        name: 'Samsung Galaxy S22',
        slug: 'samsung-galaxy-s22',
        description: 'Flagship smartphone with dynamic AMOLED display.',
        price: 16500,
        sku: 'SM-GS22-128-BLK',
        isFeatured: false,
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200',
      },
    ];

    const created: any[] = [];
    for (const s of samples) {
      const p = await this.prisma.product.upsert({
        where: { slug: s.slug },
        update: {},
        create: {
          name: s.name,
          slug: s.slug,
          description: s.description,
          shortDescription: s.description,
          price: s.price,
          sku: s.sku,
          isFeatured: s.isFeatured,
          categoryId: category.id,
          brandId: brand.id,
          isActive: true,
          isFlashSale: false,
        },
      });
      // Ensure primary image exists
      const hasImage = await this.prisma.productImage.findFirst({ where: { productId: p.id, isPrimary: true } });
      if (!hasImage) {
        await this.prisma.productImage.create({
          data: { productId: p.id, url: s.image, alt: p.name, isPrimary: true, sortOrder: 0 },
        });
      }
      created.push(p);
    }
    return { success: true, count: created.length, products: created };
  }

  async seedFlashSales() {
    const now = new Date();
    const ends = new Date(now.getTime() + 1000 * 60 * 60 * 48);
    const base = await this.prisma.product.findMany({
      where: { isActive: true },
      take: 4,
      orderBy: { createdAt: 'desc' },
    });
    const updated: any[] = [];
    for (const p of base) {
      const priceNum = Number((p as any).price);
      const promo = Math.max(1, Math.round(priceNum * 0.9 * 100) / 100);
      const u = await this.prisma.product.update({
        where: { id: p.id },
        data: { isFlashSale: true, flashSaleEnd: ends, flashSalePrice: promo },
      });
      updated.push(u);
    }
    return { success: true, count: updated.length, products: updated, endsAt: ends.toISOString() };
  }
}
