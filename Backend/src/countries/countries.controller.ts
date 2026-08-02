import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, Req, Header } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CountriesService } from './countries.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AddPaymentMethodDto, UpdateCountryPaymentMethodDto } from './dto/add-payment-method.dto';
import { GeolocationService } from '../common/services/geolocation.service';

@ApiTags('Countries')
@Controller('countries')
export class CountriesController {
  constructor(
    private readonly countriesService: CountriesService,
    private readonly geolocationService: GeolocationService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a country (Admin only)' })
  create(@Body() createCountryDto: CreateCountryDto) {
    return this.countriesService.create(createCountryDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all countries (Public)' })
  @UseInterceptors(CacheInterceptor)
  findAll() {
    return this.countriesService.findAll();
  }

  @Get('detect/by-ip')
  @ApiOperation({ summary: 'Detect user country by IP and get currency (Public)' })
  @Header('Cache-Control', 'no-store')
  async detectCountryByIp(@Req() request: any) {
    const clientIp = this.geolocationService.getClientIp(request);
    const geoData = await this.geolocationService.detectCountryByIp(clientIp);
    
    if (!geoData) {
      // Return default (USD) if geolocation fails
      const defaultCountry = await this.countriesService.findByCode('US');
      return {
        success: true,
        detected: false,
        reason: 'Geolocation failed, returning default',
        country: defaultCountry,
        clientIp,
      };
    }

    // Find country by code
    const country = await this.countriesService.findByCode(geoData.countryCode);
    
    if (!country) {
      // Country not in system, return default
      const defaultCountry = await this.countriesService.findByCode('US');
      return {
        success: true,
        detected: true,
        reason: `Country ${geoData.countryCode} not configured in system`,
        detectedCountryCode: geoData.countryCode,
        country: defaultCountry,
        clientIp,
        geoData,
      };
    }

    return {
      success: true,
      detected: true,
      country,
      clientIp,
      geoData,
    };
  }

  @Post('seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seed default countries (Super Admin only)' })
  seed() {
    return this.countriesService.seedDefaults();
  }

  @Post('refresh-rates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh exchange rates (Admin only)' })
  refreshRates() {
    return this.countriesService.updateExchangeRates();
  }

  @Get('exchange-rate/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get exchange rate provider configuration (Admin only)' })
  getExchangeRateConfig() {
    return this.countriesService.getExchangeRateConfig();
  }

  @Patch('exchange-rate/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update exchange rate provider configuration (Admin only)' })
  updateExchangeRateConfig(@Body() data: {
    providerName?: string;
    primaryApiUrl?: string;
    fallbackApiUrl?: string;
    isActive?: boolean;
    updateInterval?: number;
  }) {
    return this.countriesService.updateExchangeRateConfig(data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single country (Public)' })
  @UseInterceptors(CacheInterceptor)
  findOne(@Param('id') id: string) {
    return this.countriesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a country (Admin only)' })
  update(@Param('id') id: string, @Body() updateCountryDto: UpdateCountryDto) {
    return this.countriesService.update(id, updateCountryDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a country (Super Admin only)' })
  remove(@Param('id') id: string) {
    return this.countriesService.remove(id);
  }

  @Post(':countryId/payment-methods')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a payment method to a country (Admin only)' })
  addPaymentMethod(@Param('countryId') countryId: string, @Body() data: AddPaymentMethodDto) {
    return this.countriesService.addPaymentMethod(countryId, data);
  }

  @Patch('payment-methods/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a country payment method (Admin only)' })
  updatePaymentMethod(@Param('id') id: string, @Body() data: UpdateCountryPaymentMethodDto) {
    return this.countriesService.updatePaymentMethod(id, data);
  }

  @Delete('payment-methods/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a payment method from a country (Admin only)' })
  removePaymentMethod(@Param('id') id: string) {
    return this.countriesService.removePaymentMethod(id);
  }
}
