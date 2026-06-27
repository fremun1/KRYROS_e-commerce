import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, OrderStatus, PaymentStatus } from '@prisma/client';
import { Request } from 'express';
import { Req } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';

const VALID_ORDER_STATUSES = Object.values(OrderStatus);
const VALID_PAYMENT_STATUSES = Object.values(PaymentStatus);

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all orders (Admin/Manager only)' })
  findAll(@Query('status') status?: string, @Query('skip') skip?: number, @Query('take') take?: number) {
    return this.ordersService.findAll(undefined, {
      status,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user orders' })
  async myOrders(@Req() req: Request) {
    const result = await this.ordersService.findAll((req as any).user.id, { take: 20, skip: 0 });
    return result.data;
  }

  @Get('track')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Track order by number and email (Public)' })
  async trackOrder(@Query('orderNumber') orderNumber: string, @Query('email') email: string) {
    if (!orderNumber || !email) {
      throw new BadRequestException('Both orderNumber and email are required');
    }
    return this.ordersService.trackOrder(orderNumber, email);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order by ID (owner or admin)' })
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const order = await this.ordersService.findById(id);

    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER].includes(user.role);
    if (!isAdmin && order.userId !== user.id) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return order;
  }

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create order (authenticated or guest)' })
  create(@Req() req: Request, @Body() data: CreateOrderDto) {
    const userId = (req as any).user?.id;
    return this.ordersService.create(userId, data);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status (Admin/Manager only)' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status?: string,
    @Body('paymentStatus') paymentStatus?: string,
    @Body('trackingNumber') trackingNumber?: string,
    @Body('notes') notes?: string,
  ) {
    if (!status && !paymentStatus) {
      throw new BadRequestException('At least one of status or paymentStatus is required');
    }
    if (status && !VALID_ORDER_STATUSES.includes(status as OrderStatus)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(', ')}`,
      );
    }
    if (paymentStatus && !VALID_PAYMENT_STATUSES.includes(paymentStatus as PaymentStatus)) {
      throw new BadRequestException(
        `Invalid paymentStatus. Must be one of: ${VALID_PAYMENT_STATUSES.join(', ')}`,
      );
    }
    return this.ordersService.updateStatus(id, status, paymentStatus, trackingNumber, notes);
  }

  @Put('bulk-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk update order statuses (Admin/Manager only)' })
  async bulkUpdateStatus(
    @Body('ids') ids: string[],
    @Body('status') status: string,
  ) {
    if (!ids || !ids.length) {
      throw new BadRequestException('At least one order ID is required');
    }
    if (!VALID_ORDER_STATUSES.includes(status as OrderStatus)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(', ')}`,
      );
    }
    return this.ordersService.bulkUpdateStatus(ids, status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a single order (Admin/Manager only)' })
  async deleteOrder(@Param('id') id: string) {
    return this.ordersService.deleteOrder(id);
  }

  @Post('bulk-delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk delete orders (Admin/Manager only)' })
  async bulkDeleteOrders(@Body('ids') ids: string[]) {
    if (!ids || !ids.length) {
      throw new BadRequestException('At least one order ID is required');
    }
    return this.ordersService.bulkDeleteOrders(ids);
  }
}
