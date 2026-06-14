import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFiles, BadRequestException, Request } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UpdateProductFlagsDto } from './dto/update-product-flags.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import type { Express } from 'express';

const imageUploadOptions = {
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: any, file: Express.Multer.File, cb: (error: Error | null, accept: boolean) => void) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException(`File type '${file.mimetype}' is not allowed. Only JPEG, PNG, WebP, and GIF images are accepted.`), false);
    }
  },
};

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get all products (Public)' })
  findAll(
    @Request() req,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('categoryId') categoryId?: string,
    @Query('categorySlug') categorySlug?: string,
    @Query('search') search?: string,
    @Query('featured') featured?: string,
    @Query('allowCredit') allowCredit?: string,
    @Query('isWholesaleOnly') isWholesaleOnly?: string,
    @Query('isFlashSale') isFlashSale?: string,
    @Query('showInactive') showInactive?: string,
    @Query('popularity') popularity?: string,
  ) {
    const isAdmin = req.user && (
      req.user.role === UserRole.ADMIN ||
      req.user.role === UserRole.SUPER_ADMIN ||
      req.user.role === UserRole.MANAGER
    );

    // Only admins can request inactive products — strip the flag for everyone else
    const resolvedShowInactive = isAdmin
      ? showInactive === 'true'
      : false;

    return this.productsService.findAll({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      categoryId,
      categorySlug,
      search,
      isFeatured: featured === 'true' ? true : featured === 'false' ? false : undefined,
      allowCredit: allowCredit === 'true' ? true : allowCredit === 'false' ? false : undefined,
      isWholesaleOnly: isWholesaleOnly === 'true' ? true : isWholesaleOnly === 'false' ? false : undefined,
      isFlashSale: isFlashSale === 'true' ? true : isFlashSale === 'false' ? false : undefined,
      showInactive: resolvedShowInactive,
      popularity,
    });
  }

  @Post('reset-credit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reset all product credit flags (Admin only)' })
  resetCreditFlags() {
    return this.productsService.resetCreditFlags();
  }

  @Get('credit')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get products available for credit (Public)' })
  getCreditProducts(@Query('skip') skip?: number, @Query('take') take?: number) {
    return this.productsService.findAll({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      allowCredit: true,
    });
  }

  @Get('featured')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get featured products (Public)' })
  getFeatured(@Query('take') take?: number) {
    return this.productsService.getFeaturedProducts(take ? Number(take) : undefined);
  }

  @Get('flash-sales')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get flash sale products (Public)' })
  getFlashSales() {
    return this.productsService.getFlashSaleProducts();
  }

  @Get('grouped')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get products grouped by category and brand (Public)' })
  getGrouped(
    @Query('featured') featured?: string,
    @Query('allowCredit') allowCredit?: string,
  ) {
    const isFeatured = featured === 'true' ? true : featured === 'false' ? false : undefined;
    const isCredit = allowCredit === 'true' ? true : allowCredit === 'false' ? false : undefined;
    return this.productsService.getGroupedProducts(isFeatured, isCredit);
  }

  @Put(':id/flags')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product feature/flash flags (Admin only)' })
  updateFlags(@Param('id') id: string, @Body() body: UpdateProductFlagsDto) {
    return this.productsService.updateFlags(id, body);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create product (Admin only)' })
  create(@Body() body: CreateProductDto) {
    return this.productsService.create(body);
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 10 }], imageUploadOptions))
  @ApiOperation({ summary: 'Create product with image files (Admin only)' })
  createUpload(@Body() body: CreateProductDto, @UploadedFiles() files: { images?: Express.Multer.File[] }) {
    const imgs = files?.images || [];
    return this.productsService.createWithFiles(body, imgs);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product (Admin only)' })
  update(@Param('id') id: string, @Body() body: UpdateProductDto) {
    return this.productsService.update(id, body);
  }

  @Post(':id/upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 10 }], imageUploadOptions))
  @ApiOperation({ summary: 'Update product with image files (Admin only)' })
  updateUpload(
    @Param('id') id: string,
    @Body() body: UpdateProductDto,
    @UploadedFiles() files: { images?: Express.Multer.File[] },
  ) {
    const imgs = files?.images || [];
    return this.productsService.updateWithFiles(id, body, imgs);
  }

  @Post('seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seed sample products (Super Admin only)' })
  seed() {
    return this.productsService.seedSampleProducts();
  }

  @Post('flash-sales/seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seed flash sale deals (Super Admin only)' })
  seedFlash() {
    return this.productsService.seedFlashSales();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID (Public)' })
  findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get product by slug (Public)' })
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product (Admin only)' })
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
