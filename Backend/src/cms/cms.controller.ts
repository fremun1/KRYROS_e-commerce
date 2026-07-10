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

  @Post('sections/seed/:slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seed default sections for a page' })
  seedSections(@Param('slug') slug: string) {
    return this.cmsService.seedSections();
  }

  // ==================== BANNER MANAGEMENT ====================

  @Get('banners')
  @ApiOperation({ summary: 'List all banners' })
  listBanners(@Query('tag') tag?: string) {
    return this.cmsService.getBanners(tag);
  }

  @Get('banners/:id')
  @ApiOperation({ summary: 'Get banner by id' })
  getBannerById(@Param('id') id: string) {
    return this.cmsService.listBanners(); // Note: Service doesn't have getById, fallback to list
  }

  @Post('banners')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new banner' })
  createBanner(@Body() data: any) {
    return this.cmsService.createBanner(data);
  }

  @Put('banners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a banner' })
  updateBanner(@Param('id') id: string, @Body() data: any) {
    return this.cmsService.updateBanner(id, data);
  }

  @Delete('banners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a banner' })
  deleteBanner(@Param('id') id: string) {
    return this.cmsService.deleteBanner(id);
  }

  // ==================== BRAND BANNER MANAGEMENT ====================

  @Get('brand-banners')
  @ApiOperation({ summary: 'List all active brand banners' })
  listActiveBrandBanners() {
    return this.cmsService.getBrandBanners(true);
  }

  @Get('brand-banners/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all brand banners (admin)' })
  listBrandBanners() {
    return this.cmsService.getBrandBanners(false);
  }

  @Get('brand-banners/:slug')
  @ApiOperation({ summary: 'Get brand banner by slug' })
  getBrandBannerBySlug(@Param('slug') slug: string) {
    return this.cmsService.getBrandBannerBySlug(slug);
  }

  @Post('brand-banners')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update brand banner' })
  upsertBrandBanner(@Body() data: any) {
    return this.cmsService.upsertBrandBanner(data);
  }

  @Put('brand-banners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update brand banner by id' })
  updateBrandBanner(@Param('id') id: string, @Body() data: any) {
    const { id: _id, ...rest } = data;
    return this.cmsService.upsertBrandBanner({ ...rest });
  }

  @Delete('brand-banners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete brand banner' })
  deleteBrandBanner(@Param('id') id: string) {
    return this.cmsService.deleteBrandBanner(id);
  }

  @Post('brand-banners/seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seed default brand banners' })
  seedBrandBanners() {
    return this.cmsService.seedBrandBanners();
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
    @Query('dataSourceId') dataSourceId: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string
  ) {
    return this.sectionDataSourceService.fetchProductsByRule(
      dataSourceId,
      limit ? Number(limit) : 8,
      skip ? Number(skip) : 0
    );
  }

  @Get('sections/categories-by-source')
  @ApiOperation({ summary: 'Fetch categories for a section data source' })
  fetchCategoriesBySource(
    @Query('dataSourceId') dataSourceId: string,
    @Query('limit') limit?: string
  ) {
    return this.sectionDataSourceService.fetchCategoriesByRule(
      dataSourceId,
      limit ? Number(limit) : 12
    );
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
}
