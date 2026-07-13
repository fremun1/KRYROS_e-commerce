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

  private normalizeBrandKey(name?: string | null): string {
    return (name || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  private resolveLogo(
    dto: CreateBrandDto | UpdateBrandDto,
    preserveUndefined = false,
  ): string | null | undefined {
    // Accept either logo or logoUrl — frontend may send either.
    // On update, preserveUndefined lets us keep the existing logo if neither field was sent.
    const hasLogoUrl = Object.prototype.hasOwnProperty.call(dto, 'logoUrl');
    const hasLogo = Object.prototype.hasOwnProperty.call(dto, 'logo');

    if (!hasLogoUrl && !hasLogo) {
      return preserveUndefined ? undefined : null;
    }

    const raw = (dto as any).logoUrl ?? (dto as any).logo;
    if (raw === undefined) return preserveUndefined ? undefined : null;
    if (raw === null || raw === '') return null;
    return raw;
  }

  private dedupeBrands<T extends { id: number; name?: string | null; logo?: string | null; updatedAt?: Date }>(
    brands: T[],
  ): T[] {
    const deduped = new Map<string, T>();

    for (const brand of brands) {
      const key = this.normalizeBrandKey(brand.name) || `brand:${brand.id}`;
      const existing = deduped.get(key);

      if (!existing) {
        deduped.set(key, brand);
        continue;
      }

      const existingHasLogo = Boolean(existing.logo);
      const nextHasLogo = Boolean(brand.logo);

      if (!existingHasLogo && nextHasLogo) {
        deduped.set(key, brand);
        continue;
      }

      if (existingHasLogo === nextHasLogo) {
        const existingUpdated = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
        const nextUpdated = brand.updatedAt ? new Date(brand.updatedAt).getTime() : 0;
        if (nextUpdated > existingUpdated) {
          deduped.set(key, brand);
        }
      }
    }

    return Array.from(deduped.values()).sort((a, b) =>
      (a.name || '').localeCompare(b.name || ''),
    );
  }

  async create(dto: CreateBrandDto) {
    const slug = dto.slug || this.slugify(dto.name);

    try {
      let logoData = this.resolveLogo(dto);
      if (logoData && logoData.startsWith('data:image')) {
        logoData = await compressImage(logoData, 300, 120, 80);
      }

      const existing = await this.prisma.brand.findFirst({
        where: {
          OR: [
            { slug },
            { name: { equals: dto.name.trim(), mode: 'insensitive' } },
          ],
        },
      });

      const brandData = {
        name: dto.name.trim(),
        slug,
        logo: logoData ?? null,
        description: dto.description || null,
        website: dto.website || null,
        country: dto.country || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        categoryId: dto.categoryId || null,
      };

      const brand = existing
        ? await this.prisma.brand.update({
            where: { id: existing.id },
            data: brandData,
          })
        : await this.prisma.brand.create({
            data: brandData,
          });

      await this.invalidateBrandCache();
      return brand;
    } catch (e: any) {
      if (e instanceof ConflictException) throw e;
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
      const deduped = this.dedupeBrands(result);
      await this.cacheManager.set('brands:all', deduped, 5 * 60 * 1000);
      return deduped;
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
    const logoRaw = this.resolveLogo(dto, true);
    if (logoRaw !== undefined) {
      if (logoRaw && logoRaw.startsWith('data:image')) {
        updateData.logo = await compressImage(logoRaw, 300, 120, 80);
      } else {
        updateData.logo = logoRaw;
      }
    }

    const updated = await this.prisma.brand.update({ where: { id }, data: updateData });
    await this.invalidateBrandCache();
    return updated;
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
