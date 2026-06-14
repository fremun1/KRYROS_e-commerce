import { Controller, Get, Put, Body, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all system settings (Admin only)' })
  findAll() {
    return this.settingsService.getAll();
  }

  @Get('shipping')
  @ApiOperation({ summary: 'Get shipping configuration' })
  getShippingConfig() {
    return this.settingsService.getShippingConfig();
  }

  @Get('store-status')
  @ApiOperation({ summary: 'Get store status (open/closed) - Public' })
  async getStoreStatus() {
    const [
      isClosedSetting,
      messageSetting,
      openingTimeSetting,
      closingTimeSetting,
      operatingDaysSetting,
      nextOpeningTimeSetting,
      nextOpeningDaySetting,
    ] = await Promise.all([
      this.settingsService.getByKey('is_store_closed_manual'),
      this.settingsService.getByKey('store_closed_message'),
      this.settingsService.getByKey('opening_time'),
      this.settingsService.getByKey('closing_time'),
      this.settingsService.getByKey('store_operating_days'),
      this.settingsService.getByKey('next_opening_time'),
      this.settingsService.getByKey('next_opening_day'),
    ]);

    return {
      isStoreClosed: isClosedSetting?.value === 'true',
      message: messageSetting?.value || 'We are currently closed. Please come back later.',
      openingTime: openingTimeSetting?.value || '08:00',
      closingTime: closingTimeSetting?.value || '18:00',
      operatingDays: operatingDaysSetting?.value || 'Mon - Sun',
      nextOpeningTime: nextOpeningTimeSetting?.value || '06:00 PM',
      nextOpeningDay: nextOpeningDaySetting?.value || 'Thursday',
    };
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk update settings (Admin only)' })
  async updateBulk(@Body() data: Record<string, string>) {
    await Promise.all(
      Object.entries(data).map(([key, value]) => this.settingsService.update(key, String(value)))
    );
    return { success: true, message: 'Settings updated' };
  }

  @Put(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a setting by key (Admin only)' })
  update(@Param('key') key: string, @Body('value') value: string) {
    return this.settingsService.update(key, value);
  }
}
