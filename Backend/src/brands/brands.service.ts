import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import { compressImage } from '../common/utils/image.util';

@Injectable()
export class BrandsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private async invalidateBrandCache() {
    await this.cacheManager.del('brands:all');
  }

  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
  }

  private resolveLogo(dto: CreateBrandDto | UpdateBrandDto): string | null | undefined {
    // Accept either logo or logoUrl — frontend may send either
    const raw = (dto as any).logoUrl || (dto as any).logo;
    return raw || null;
  }

  async create(dto: CreateBrandDto) {
    const slug = dto.slug || this.slugify(dto.name);

    const existing = await this.prisma.brand.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Brand with slug "${slug}" already exists`);
    }

    try {
      let logoData = this.resolveLogo(dto);
      if (logoData && logoData.startsWith('data:image')) {
        logoData = await compressImage(logoData, 300, 120, 80);
      }
      const brand = await this.prisma.brand.create({
        data: {
          name: dto.name,
          slug,
          logo: logoData ?? null,
          description: dto.description || null,
          website: dto.website || null,
          country: dto.country || null,
          isActive: dto.isActive !== undefined ? dto.isActive : true,
          categoryId: dto.categoryId || null,
        },
      });
      await this.invalidateBrandCache();
      return brand;
    } catch (e: any) {
      throw new InternalServerErrorException(`Failed to create brand: ${e.message}`);
    }
  }

  async findAll() {
    const cached = await this.cacheManager.get<any[]>('brands:all');
    if (cached) return cached;
    try {
      const result = await this.prisma.brand.findMany({
        where: { isActive: true },
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { name: 'asc' },
      });
      await this.cacheManager.set('brands:all', result, 5 * 60 * 1000);
      return result;
    } catch {
      return [];
    }
  }

  async findOne(id: number) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: { products: true },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async update(id: number, dto: UpdateBrandDto) {
    await this.findOne(id);

    // Build explicit update payload — never spread dto directly to avoid unknown Prisma fields
    const updateData: any = {};
    if (dto.name !== undefined) {
      updateData.name = dto.name;
      if (!dto.slug) updateData.slug = this.slugify(dto.name);
    }
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.website !== undefined) updateData.website = dto.website;
    if (dto.country !== undefined) updateData.country = dto.country;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.categoryId !== undefined) updateData.categoryId = dto.categoryId;

    // Handle logo — accept both logo and logoUrl
    const logoRaw = this.resolveLogo(dto);
    if (logoRaw !== undefined) {
      if (logoRaw && logoRaw.startsWith('data:image')) {
        updateData.logo = await compressImage(logoRaw, 300, 120, 80);
      } else {
        updateData.logo = logoRaw;
      }
    }

    return this.prisma.brand.update({ where: { id }, data: updateData });
  }

  async remove(id: number) {
    await this.findOne(id);
    // Soft delete — preserves products referencing this brand
    const result = await this.prisma.brand.update({ where: { id }, data: { isActive: false } });
    // Clear cache so the brand disappears from the list immediately
    await this.invalidateBrandCache();
    return result;
  }

  async cleanupCorruptedData() {
    const updatedProducts = await this.prisma.product.updateMany({ data: { brandId: null } });

    // Security: use $executeRaw tagged template literal instead of $executeRawUnsafe.
    // Both strings are static/hardcoded (no user input), but $executeRaw enforces
    // the parameterised-query pattern and prevents accidental injection if ever refactored.
    try {
      await this.prisma.$executeRaw`TRUNCATE TABLE "brands" RESTART IDENTITY CASCADE`;
    } catch {
      await this.prisma.brand.deleteMany({});
    }

    try {
      await this.prisma.$executeRaw`ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "showOnHome" BOOLEAN DEFAULT false`;
    } catch {
      // Column may already exist — safe to ignore
    }

    return {
      message: 'Database cleanup complete',
      productsUpdated: updatedProducts.count,
      brandsCleared: true,
    };
  }
}
