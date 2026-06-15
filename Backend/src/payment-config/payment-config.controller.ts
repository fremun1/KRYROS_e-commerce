import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { PaymentConfigService } from './payment-config.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('payment-config')
export class PaymentConfigController {
  constructor(private readonly svc: PaymentConfigService) {}

  // ── Public (customer frontend) ─────────────────────────────────────────
  @Get('public')
  getPublic() {
    return this.svc.getEnabledMethods();
  }

  // ── Admin: Methods ─────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('methods')
  getMethods() {
    return this.svc.getMethods();
  }

  @UseGuards(JwtAuthGuard)
  @Post('methods')
  createMethod(@Body() body: { name: string; type: string; icon?: string }) {
    return this.svc.createMethod(body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('methods/reorder')
  reorderMethods(@Body() body: { orders: { id: string; sortOrder: number }[] }) {
    return this.svc.reorderMethods(body.orders);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('methods/:id')
  updateMethod(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateMethod(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('methods/:id')
  deleteMethod(@Param('id') id: string) {
    return this.svc.deleteMethod(id);
  }

  // ── Admin: Providers ───────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('providers/:methodId')
  getProviders(@Param('methodId') methodId: string) {
    return this.svc.getProviders(methodId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('providers')
  createProvider(@Body() body: { paymentMethodId: string; name: string; description?: string; config?: any }) {
    return this.svc.createProvider(body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('providers/:id')
  updateProvider(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateProvider(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('providers/:id')
  deleteProvider(@Param('id') id: string) {
    return this.svc.deleteProvider(id);
  }

  // ── Admin: Networks ────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('networks/:providerId')
  getNetworks(@Param('providerId') providerId: string) {
    return this.svc.getNetworks(providerId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('networks')
  createNetwork(@Body() body: { providerId: string; name: string }) {
    return this.svc.createNetwork(body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('networks/:id')
  updateNetwork(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateNetwork(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('networks/:id')
  deleteNetwork(@Param('id') id: string) {
    return this.svc.deleteNetwork(id);
  }
}
