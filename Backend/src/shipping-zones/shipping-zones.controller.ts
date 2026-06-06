import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShippingZonesService } from './shipping-zones.service';
import { CreateShippingZoneDto } from './dto/create-shipping-zone.dto';
import { UpdateShippingZoneDto } from './dto/update-shipping-zone.dto';
import { CreateLocationShippingMethodDto } from './dto/create-location-shipping-method.dto';
import { UpdateShippingMethodDto } from './dto/update-shipping-method.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Shipping Zones')
@Controller('shipping-zones')
@UseInterceptors(CacheInterceptor)
export class ShippingZonesController {
  constructor(private readonly shippingZonesService: ShippingZonesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a shipping zone (Admin only)' })
  create(@Body() createShippingZoneDto: CreateShippingZoneDto) {
    return this.shippingZonesService.create(createShippingZoneDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all shipping zones (Public)' })
  findAll() {
    return this.shippingZonesService.findAll();
  }

  @Get('status')
  @ApiOperation({ summary: 'Check if shipping zones feature is enabled (Public)' })
  getStatus() {
    return this.shippingZonesService.isEnabled();
  }

  @Post('toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable or disable shipping zones feature (Admin only)' })
  toggle(@Body('enabled') enabled: boolean) {
    return this.shippingZonesService.toggleFeature(enabled);
  }

  @Get('matching')
  @ApiOperation({ summary: 'Find shipping methods matching a location (Public)' })
  findMatching(
    @Query('countryId') countryId?: string,
    @Query('stateId') stateId?: string,
    @Query('cityId') cityId?: string,
    @Query('manual') manual?: string,
    @Query('stateName') stateName?: string,
    @Query('cityName') cityName?: string,
  ) {
    return this.shippingZonesService.findMatchingMethods(
      countryId,
      stateId,
      cityId,
      manual === 'true',
      stateName,
      cityName,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single shipping zone (Public)' })
  findOne(@Param('id') id: string) {
    return this.shippingZonesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a shipping zone (Admin only)' })
  update(@Param('id') id: string, @Body() updateShippingZoneDto: UpdateShippingZoneDto) {
    return this.shippingZonesService.update(id, updateShippingZoneDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a shipping zone (Admin only)' })
  remove(@Param('id') id: string) {
    return this.shippingZonesService.remove(id);
  }

  @Post('methods')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a shipping method to a zone (Admin only)' })
  addMethod(@Body() dto: CreateLocationShippingMethodDto) {
    return this.shippingZonesService.addMethod(dto);
  }

  @Patch('methods/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a shipping method (Admin only)' })
  updateMethod(@Param('id') id: string, @Body() data: UpdateShippingMethodDto) {
    return this.shippingZonesService.updateMethod(id, data);
  }

  @Delete('methods/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a shipping method (Admin only)' })
  removeMethod(@Param('id') id: string) {
    return this.shippingZonesService.removeMethod(id);
  }
}
