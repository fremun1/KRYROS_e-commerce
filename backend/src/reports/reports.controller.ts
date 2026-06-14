import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get summary metrics and series for admin reports' })
  summary(@Query('range') range?: string) {
    return this.reportsService.summary(range || 'year');
  }
}
