import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WholesaleService } from './wholesale.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { ApplyWholesaleDto } from './dto/apply-wholesale.dto';
import { UpdateWholesaleApplicationStatusDto } from './dto/update-wholesale-application-status.dto';

@ApiTags('Wholesale')
@Controller('wholesale')
export class WholesaleController {
  constructor(private wholesaleService: WholesaleService) {}

  // ── Wholesale Applications ──────────────────────────────

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply for a wholesale account' })
  apply(@Req() req: Request, @Body() body: ApplyWholesaleDto) {
    const userId = (req as any).user.id;
    return this.wholesaleService.apply(userId, body);
  }

  @Get('applications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all wholesale applications (Admin only)' })
  findAllApplications(@Query('status') status?: string) {
    return this.wholesaleService.findAllApplications(status);
  }

  @Get('applications/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single wholesale application (Admin only)' })
  findOneApplication(@Param('id') id: string) {
    return this.wholesaleService.findOneApplication(id);
  }

  @Put('applications/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update wholesale application status (Admin only)' })
  updateApplicationStatus(
    @Param('id') id: string,
    @Body() body: UpdateWholesaleApplicationStatusDto,
  ) {
    return this.wholesaleService.updateApplicationStatus(id, body.status, body.notes);
  }

  // ── Wholesale Accounts ──────────────────────────────────

  @Get('accounts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all wholesale accounts (Admin only)' })
  findAllAccounts(@Query('status') status?: string) {
    return this.wholesaleService.findAllAccounts(status);
  }

  @Put('accounts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a wholesale account (Admin only)' })
  updateAccount(@Param('id') id: string, @Body() body: any) {
    return this.wholesaleService.updateAccount(id, body);
  }

  @Put('accounts/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update wholesale account status (Admin only)' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('notes') notes?: string,
  ) {
    return this.wholesaleService.updateAccountStatus(id, status, notes);
  }

  @Delete('accounts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a wholesale account (Admin only)' })
  deleteAccount(@Param('id') id: string) {
    return this.wholesaleService.deleteAccount(id);
  }

  @Get('my-account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user wholesale account' })
  getMyAccount(@Req() req: Request) {
    const userId = (req as any).user.id;
    return this.wholesaleService.getAccount(userId);
  }

  @Get('accounts/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wholesale account by user ID (Admin only)' })
  getAccount(@Param('userId') userId: string) {
    return this.wholesaleService.getAccount(userId);
  }

  @Get('my-applications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user wholesale applications' })
  getMyApplications(@Req() req: Request) {
    const userId = (req as any).user.id;
    return this.wholesaleService.findUserApplications(userId);
  }

  // ── Wholesale Deals ───────────────────────────────────────

  @Get('deals')
  @ApiOperation({ summary: 'List all wholesale deals' })
  findAllDeals(@Query('accountId') accountId?: string) {
    return this.wholesaleService.findAllDeals(accountId);
  }

  @Post('deals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a wholesale deal (Admin only)' })
  createDeal(@Body() body: any) {
    return this.wholesaleService.createDeal(body);
  }

  @Put('deals/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a wholesale deal (Admin only)' })
  updateDeal(@Param('id') id: string, @Body() body: any) {
    return this.wholesaleService.updateDeal(id, body);
  }

  @Delete('deals/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a wholesale deal (Admin only)' })
  deleteDeal(@Param('id') id: string) {
    return this.wholesaleService.deleteDeal(id);
  }

  // ── Tiered Pricing ────────────────────────────────────────

  @Post('prices/:productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set tiered wholesale prices for a product (Admin only)' })
  setPrices(
    @Param('productId') productId: string,
    @Body() prices: { minQuantity: number; price: number; accountId?: string }[],
  ) {
    return this.wholesaleService.setProductWholesalePrices(productId, prices);
  }

  @Get('prices/:productId')
  @ApiOperation({ summary: 'Get tiered wholesale prices for a product (Public)' })
  getPrices(@Param('productId') productId: string) {
    return this.wholesaleService.getProductWholesalePrices(productId);
  }
}
