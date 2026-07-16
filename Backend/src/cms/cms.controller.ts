import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Put,
} from '@nestjs/common';
import { CMSService } from './cms.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SectionDataSourceService } from './section-data-source.service';

@ApiTags('CMS')
@Controller('cms')
export class CMSController {
  constructor(
    private readonly cmsService: CMSService,
    private readonly sectionDataSourceService: SectionDataSourceService,
  ) {}

  // ==================== PAGE MANAGEMENT ====================

  @Get('pages')
  @ApiOperation({ summary: 'List all CMS pages' })
  listPages() {
    return this.cmsService.listPages();
  }

  @Post('pages/seed-all')
  @ApiOperation({ summary: 'Seed all default CMS pages' })
  seedAllPages() {
    return this.cmsService.seedAllPages();
  }

  @Get('pages/:slug')
  @ApiOperation({ summary: 'Get page by slug' })
  getPageBySlug(@Param('slug') slug: string) {
    return this.cmsService.getPage(slug);
  }

  // ==================== SECTION MANAGEMENT ====================

  @Get('sections')
  @ApiOperation({ summary: 'List all sections for a page' })
  listSections(@Query('pageSlug') pageSlug: string) {
    return this.cmsService.getSections(pageSlug);
  }

  @Get('sections/manage')
  @ApiOperation({ summary: 'List all sections for admin panel (with manage endpoint)' })
  manageSections(@Query('pageSlug') pageSlug: string) {
    return this.cmsService.listSections(pageSlug);
  }

  @Post('sections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new section' })
  createSection(@Body() data: any) {
    return this.cmsService.createSection(data);
  }

  @Put('sections/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a section' })
  updateSection(@Param('id') id: string, @Body() data: any) {
    return this.cmsService.updateSection(id, data);
  }

  @Delete('sections/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a section' })
  deleteSection(@Param('id') id: string) {
    return this.cmsService.deleteSection(id);
  }

  @Post('sections/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder sections' })
  reorderSections(@Body() data: { pageSlug: string; idsInOrder: string[] }) {
    return this.cmsService.reorderSections(data.pageSlug, data.idsInOrder);
  }

  @Post('sections/reset-seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reset and seed default sections for a page' })
  resetSeedSections(@Body() data: { slug: string }) {
    return this.cmsService.resetAndSeedSectionsBySlug(data.slug);
  }

  @Post('sections/seed/:slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seed default sections for a page' })
  seedSections(@Param('slug') slug: string) {
    return this.cmsService.resetAndSeedSectionsBySlug(slug);
  }

  // ==================== SECTION DATA SOURCES ====================

  @Get('section-rules')
  @ApiOperation({ summary: 'Get all available section data source rules' })
  getAllSectionRules() {
    return this.sectionDataSourceService.getAllRules();
  }

  @Get('section-rules/metadata')
  @ApiOperation({ summary: 'Get section rules metadata (for admin UI dropdowns)' })
  getSectionRulesMetadata() {
    return this.sectionDataSourceService.getRuleMetadata();
  }

  @Get('section-rules/metadata-grouped')
  @ApiOperation({ summary: 'Get section rules metadata grouped by category' })
  getSectionRulesMetadataGrouped() {
    return this.sectionDataSourceService.getRuleMetadataGroupedByCategory();
  }

  @Get('sections/products-by-source')
  @ApiOperation({ summary: 'Fetch products for a section data source' })
  fetchProductsBySource(
    @Query() query: any
  ) {
    const { dataSourceId, limit, skip, ...extraParams } = query;
    return this.sectionDataSourceService.fetchProductsByRule(
      dataSourceId,
      limit ? Number(limit) : 8,
      skip ? Number(skip) : 0,
      extraParams
    );
  }

  @Get('sections/brands-by-source')
  @ApiOperation({ summary: 'Fetch brands for a section data source' })
  fetchBrandsBySource(
    @Query('dataSourceId') dataSourceId: string,
    @Query('limit') limit?: string
  ) {
    return this.sectionDataSourceService.fetchBrandsByRule(
      dataSourceId,
      limit ? Number(limit) : 12
    );
  }

  @Get('sections/:idOrSlug')
  @ApiOperation({ summary: 'Get a single section by ID or slug' })
  getSectionByIdOrSlug(
    @Param('idOrSlug') idOrSlug: string,
    @Query('pageSlug') pageSlug?: string
  ) {
    return this.cmsService.getSectionByIdOrSlug(idOrSlug, pageSlug);
  }

  @Patch('sections/:id/move')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Move a section up or down' })
  moveSectionInOrder(
    @Param('id') id: string,
    @Query('direction') direction: 'up' | 'down',
    @Query('pageSlug') pageSlug: string = 'homepage'
  ) {
    return this.cmsService.moveSectionInOrder(id, direction, pageSlug);
  }

  // ==================== HOMEPAGE SECTIONS (Legacy Support) ====================

  @Get('homepage-sections/manage')
  @ApiOperation({ summary: 'List all homepage sections (legacy support)' })
  manageHomePageSections() {
    return this.cmsService.getHomePageSections();
  }

  @Get('homepage-sections')
  @ApiOperation({ summary: 'List all active homepage sections' })
  getHomePageSections(@Query('type') type?: string) {
    return this.cmsService.getHomePageSections(type);
  }

  @Post('homepage-sections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new homepage section' })
  createHomePageSection(@Body() data: any) {
    return this.cmsService.createHomePageSection(data);
  }

  @Put('homepage-sections/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a homepage section' })
  updateHomePageSection(@Param('id') id: string, @Body() data: any) {
    return this.cmsService.updateHomePageSection(id, data);
  }

  @Delete('homepage-sections/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a homepage section' })
  deleteHomePageSection(@Param('id') id: string) {
    return this.cmsService.deleteHomePageSection(id);
  }

  @Post('homepage-sections/seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seed default homepage sections' })
  seedHomePageSections() {
    return this.cmsService.seedHomePageSections();
  }

  @Post('homepage-sections/reset-seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reset and seed default homepage sections' })
  resetSeedHomePageSections() {
    return this.cmsService.resetAndSeedHomePageSections();
  }

  // ==================== SITE CONFIG MANAGEMENT ====================

  @Get('site-config')
  @ApiOperation({ summary: 'Get all site configs' })
  getSiteConfigs() {
    return this.cmsService.getSiteConfigs();
  }

  @Get('site-config/:key')
  @ApiOperation({ summary: 'Get site config by key' })
  getSiteConfig(@Param('key') key: string) {
    return this.cmsService.getSiteConfig(key);
  }

  @Put('site-config/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upsert site config' })
  upsertSiteConfig(@Param('key') key: string, @Body() data: { value: unknown }) {
    return this.cmsService.upsertSiteConfig(key, data.value);
  }

  @Post('site-config/seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seed default site configs' })
  seedSiteConfigs() {
    return this.cmsService.seedSiteConfigs();
  }

  // ==================== DATA MIGRATION ====================

  @Post('sections/migrate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Migrate all legacy section records to the new 7-family model' })
  migrateSections() {
    return this.cmsService.migrateLegacySections();
  }
}
