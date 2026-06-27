import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Req, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewStatusDto } from './dto/review.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

const ADMIN_ROLES = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER];

@Controller('reviews')
@UseInterceptors(CacheInterceptor)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  create(@Req() req, @Body() createReviewDto: CreateReviewDto) {
    const userId = req.user?.id || null;
    return this.reviewsService.create(userId, createReviewDto);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(
    @Req() req,
    @Query('productId') productId?: string,
    @Query('isFeatured') isFeatured?: string,
    @Query('isApproved') isApproved?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const isAdmin = req.user && ADMIN_ROLES.includes(req.user.role);

    // Non-admins can only see approved reviews — never leak pending/rejected ones
    const approvedFilter = isAdmin && isApproved !== undefined
      ? isApproved === 'true'
      : true;

    return this.reviewsService.findAll({
      productId,
      isFeatured: isFeatured !== undefined ? isFeatured === 'true' : undefined,
      isApproved: approvedFilter,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Get('product/:productId/rating')
  getProductRating(@Param('productId') productId: string) {
    return this.reviewsService.getProductRating(productId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  updateStatus(@Param('id') id: string, @Body() updateReviewStatusDto: UpdateReviewStatusDto) {
    return this.reviewsService.updateStatus(id, updateReviewStatusDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  remove(@Param('id') id: string) {
    return this.reviewsService.delete(id);
  }
}
