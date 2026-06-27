import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { DirectPaymentDto } from './dto/direct-payment.dto';
import { WhatsAppPaymentDto } from './dto/whatsapp-payment.dto';
import { Request } from 'express';

@ApiTags('Payments')
@Controller('payments')
@ApiBearerAuth()
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('initialize')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Send a 543/cGrate payment prompt to the customer mobile number' })
  initialize(@Body() body: InitializePaymentDto) {
    return this.paymentsService.process543Payment(body.orderId, body.phone, body.amount);
  }

  @Post('direct')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Initiate a direct mobile money payment (no pre-existing order needed)' })
  direct(@Body() body: DirectPaymentDto, @Req() req: Request) {
    const userId = (req as any).user?.id ?? null;
    return this.paymentsService.processDirectPayment(userId, body.phone, body.amount, body.currency, body.note);
  }

  @Post('whatsapp')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Create a WhatsApp payment record and return reference for manual payment' })
  whatsapp(@Body() body: WhatsAppPaymentDto, @Req() req: Request) {
    const userId = (req as any).user?.id ?? null;
    return this.paymentsService.processWhatsAppPayment(userId, body.phone, body.amount, body.currency, body.note, body.reference);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check and sync payment status for an order' })
  verify(@Body('orderId') orderId: string) {
    return this.paymentsService.checkStatus(orderId);
  }

  @Get('status/:orderId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get current payment status for an order' })
  getStatus(@Param('orderId') orderId: string) {
    return this.paymentsService.checkStatus(orderId);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List all payments (Admin only)' })
  findAll() {
    return this.paymentsService.findAll();
  }
}
