import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreditService } from './credit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { CreateCreditPlanDto } from './dto/create-credit-plan.dto';
import { UpdateCreditPlanDto } from './dto/update-credit-plan.dto';
import { ApplyCreditDto } from './dto/apply-credit.dto';

@ApiTags('Credit')
@Controller('credit')
export class CreditController {
  constructor(private creditService: CreditService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user credit profile' })
  getProfile(@Req() req: Request) {
    const userId = (req as any).user.id;
    return this.creditService.getProfile(userId);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get available credit plans (Public)' })
  getPlans(@Query('productId') productId?: string) {
    return this.creditService.getPlans({ productId });
  }

  @Post('plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new credit plan (Admin only)' })
  createPlan(@Body() body: CreateCreditPlanDto) {
    return this.creditService.createPlan(body);
  }

  @Put('plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a credit plan (Admin only)' })
  updatePlan(@Param('id') id: string, @Body() body: UpdateCreditPlanDto) {
    return this.creditService.updatePlan(id, body);
  }

  @Delete('plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a credit plan (Admin only)' })
  deletePlan(@Param('id') id: string) {
    return this.creditService.deletePlan(id);
  }

  @Get('applications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all credit applications (Admin only)' })
  getApplications(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('status') status?: string,
  ) {
    return this.creditService.getCreditApplications({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      status,
    });
  }

  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user credit accounts' })
  getAccounts(@Req() req: Request) {
    const userId = (req as any).user.id;
    return this.creditService.getAccounts(userId);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all credit accounts (Admin only)' })
  getAll(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('status') status?: string,
  ) {
    return this.creditService.getAllAccounts({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      status,
    });
  }

  @Put('applications/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update credit application status (Admin only)' })
  updateApplicationStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.creditService.updateApplicationStatus(id, body.status);
  }

  @Put('accounts/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update credit account status (Admin only)' })
  updateAccountStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.creditService.updateAccountStatus(id, body.status);
  }

  @Get('my-applications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user credit applications' })
  getMyApplications(@Req() req: Request) {
    const userId = (req as any).user.id;
    return this.creditService.getMyApplications(userId);
  }

  @Get('my-credits')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user credit accounts' })
  getMyCredits(@Req() req: Request) {
    const userId = (req as any).user.id;
    return this.creditService.getAccounts(userId);
  }

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate installment (Public)' })
  calculate(@Body() body: { amount: number; planId: string }) {
    const amount = Number(body.amount);
    if (!body.planId || typeof body.planId !== 'string' || body.planId.trim() === '') {
      throw new BadRequestException('planId is required');
    }
    if (!isFinite(amount) || amount <= 0 || amount > 10_000_000) {
      throw new BadRequestException('amount must be a positive number not exceeding 10,000,000');
    }
    return this.creditService.calculateInstallment(amount, body.planId);
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply for credit' })
  apply(@Req() req: Request, @Body() body: ApplyCreditDto) {
    const userId = (req as any).user.id;
    return this.creditService.applyForCredit(userId, body);
  }
}
