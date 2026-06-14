import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { WishlistService } from './wishlist.service';
import { Request } from 'express';

@ApiTags('Wishlist')
@Controller('wishlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WishlistController {
  constructor(private wishlist: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user wishlist items' })
  getMine(@Req() req: Request) {
    return this.wishlist.getForUser((req as any).user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add product to wishlist' })
  add(@Req() req: Request, @Body('productId') productId: string) {
    return this.wishlist.add((req as any).user.id, productId);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Remove product from wishlist' })
  remove(@Req() req: Request, @Param('productId') productId: string) {
    return this.wishlist.remove((req as any).user.id, productId);
  }
}
