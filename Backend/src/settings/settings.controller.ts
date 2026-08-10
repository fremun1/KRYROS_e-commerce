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
      autoScheduleEnabledSetting,
    ] = await Promise.all([
      this.settingsService.getByKey('is_store_closed_manual'),
      this.settingsService.getByKey('store_closed_message'),
      this.settingsService.getByKey('opening_time'),
      this.settingsService.getByKey('closing_time'),
      this.settingsService.getByKey('store_operating_days'),
      this.settingsService.getByKey('next_opening_time'),
      this.settingsService.getByKey('next_opening_day'),
      this.settingsService.getByKey('store_auto_schedule_enabled'),
    ]);

    const manualClosed = isClosedSetting?.value === 'true';
    const openingTime = openingTimeSetting?.value || '08:00';
    const closingTime = closingTimeSetting?.value || '18:00';
    const autoSchedule = autoScheduleEnabledSetting?.value === 'true';

    let scheduledClosed = false;
    if (autoSchedule && openingTime && closingTime) {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeVal = currentHours * 60 + currentMinutes;

      const [openH, openM] = openingTime.split(':').map(Number);
      const [closeH, closeM] = closingTime.split(':').map(Number);
      const openVal = (openH || 0) * 60 + (openM || 0);
      const closeVal = (closeH || 0) * 60 + (closeM || 0);

      // If opening time < closing time (e.g. 08:00 to 18:00): closed if current time < open or current time >= close
      if (openVal < closeVal) {
        if (currentTimeVal < openVal || currentTimeVal >= closeVal) {
          scheduledClosed = true;
        }
      } else if (openVal > closeVal) {
        // Overnight hours (e.g. 20:00 to 06:00)
        if (currentTimeVal >= closeVal && currentTimeVal < openVal) {
          scheduledClosed = true;
        }
      }
    }

    const isStoreClosed = manualClosed || scheduledClosed;
    const message = messageSetting?.value || 'We are currently closed. Please come back later.';

    return {
      isStoreClosed,
      manualClosed,
      scheduledClosed,
      message,
      openingTime,
      closingTime,
      operatingDays: operatingDaysSetting?.value || 'Mon - Sun',
      nextOpeningTime: nextOpeningTimeSetting?.value || '06:00 PM',
      nextOpeningDay: nextOpeningDaySetting?.value || 'Thursday',
    };
  }

  /**
   * Public endpoint — returns a map of CSS variable names to their current color values.
   * The User-UI fetches this at boot time and applies the values to document.documentElement.
   * No authentication required: only color values are exposed, no sensitive data.
   */
  @Get('theme')
  @ApiOperation({ summary: 'Get theme color CSS variables (Public)' })
  getThemeColors() {
    return this.settingsService.getThemeColors();
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk update settings (Admin/Manager only)' })
  async updateBulk(@Body() data: Record<string, string>) {
    await Promise.all(
      Object.entries(data).map(([key, value]) => this.settingsService.update(key, String(value)))
    );
    return { success: true, message: 'Settings updated' };
  }

  @Put(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a setting by key (Admin/Manager only)' })
  update(@Param('key') key: string, @Body('value') value: string) {
    return this.settingsService.update(key, value);
  }
}
