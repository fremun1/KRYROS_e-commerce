import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PickupStationsService } from './pickup-stations.service';
import { CreatePickupStationDto, UpdatePickupStationDto } from './dto/pickup-station.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Pickup Stations')
@Controller('pickup-stations')
export class PickupStationsController {
  constructor(private readonly pickupStationsService: PickupStationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a pickup station (Admin only)' })
  create(@Body() dto: CreatePickupStationDto) {
    return this.pickupStationsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all pickup stations (Public)' })
  findAll(
    @Query('city') city?: string,
    @Query('active') active?: string,
  ) {
    const isActive = active === 'true' ? true : active === 'false' ? false : undefined;
    return this.pickupStationsService.findAll(city, isActive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a pickup station by ID (Public)' })
  findOne(@Param('id') id: string) {
    return this.pickupStationsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a pickup station (Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdatePickupStationDto) {
    return this.pickupStationsService.update(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle pickup station active/inactive (Admin only)' })
  toggleStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.pickupStationsService.toggleStatus(id, isActive);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a pickup station (Admin only)' })
  remove(@Param('id') id: string) {
    return this.pickupStationsService.remove(id);
  }
}
