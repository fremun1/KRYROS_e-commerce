import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentLinksService } from './payment-links.service';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';
import { UpdatePaymentLinkDto } from './dto/update-payment-link.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { Request } from 'express';

@ApiTags('Payment Links')
@Controller('pay-links')
export class PaymentLinksController {
  constructor(private paymentLinksService: PaymentLinksService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new payment link (Admin only)' })
  create(@Body() data: CreatePaymentLinkDto, @Req() req: Request) {
    const userId = (req as any).user?.id;
    return this.paymentLinksService.create(data, userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all payment links (Admin only)' })
  findAll(@Query('skip') skip?: number, @Query('take') take?: number) {
    return this.paymentLinksService.findAll(skip ? Number(skip) : undefined, take ? Number(take) : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment link details (public)' })
  findById(@Param('id') id: string) {
    return this.paymentLinksService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a payment link (Admin only)' })
  update(@Param('id') id: string, @Body() data: UpdatePaymentLinkDto) {
    return this.paymentLinksService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a payment link (Admin only)' })
  delete(@Param('id') id: string) {
    return this.paymentLinksService.delete(id);
  }
}
