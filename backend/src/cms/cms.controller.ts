import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CMSService } from './cms.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { CreateFooterSectionDto } from './dto/create-footer-section.dto';
import { UpdateFooterSectionDto } from './dto/update-footer-section.dto';
import { CreateFooterLinkDto } from './dto/create-footer-link.dto';
import { UpdateFooterLinkDto } from './dto/update-footer-link.dto';
import { UpdateFooterConfigDto } from './dto/update-footer-config.dto';
import { CreateHomePageSectionDto } from './dto/create-homepage-section.dto';
import { UpdateHomePageSectionDto } from './dto/update-homepage-section.dto';

@ApiTags('CMS')
@Controller('cms')
export class CMSController {
  constructor(private cmsService: CMSService) {}

  // ==================== HOME PAGE SECTIONS ====================

  @Get('homepage-sections')
  @ApiOperation({ summary: 'Get active homepage sections, optional ?type= filter' })
  getHomePageSections(@Query('type') type?: string) {
    return this.cmsService.getHomePageSections(type);
  }

  @Post('homepage-sections/reset-seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete ALL homepage sections and re-seed for current frontend (Super Admin only)' })
  resetAndSeedHomePageSections() {
    return this.cmsService.resetAndSeedHomePageSections();
  }

  @Get('homepage-sections/manage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all homepage sections (admin)' })
  listHomePageSections() {
    return this.cmsService.listHomePageSections();
  }

  @Post('homepage-sections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create homepage section' })
  createHomePageSection(@Body() data: CreateHomePageSectionDto) {
    return this.cmsService.createHomePageSection(data);
  }

  @Put('homepage-sections/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update homepage section' })
  updateHomePageSection(@Param('id') id: string, @Body() data: UpdateHomePageSectionDto) {
    return this.cmsService.updateHomePageSection(id, data);
  }

  @Delete('homepage-sections/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete homepage section' })
  deleteHomePageSection(@Param('id') id: string) {
    return this.cmsService.deleteHomePageSection(id);
  }

  @Post('homepage-sections/seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seed default homepage sections (Super Admin only)' })
  seedHomePageSections() {
    return this.cmsService.seedHomePageSections();
  }

  @Get('banners')
  @ApiOperation({ summary: 'Get active banners' })
  getBanners() {
    return this.cmsService.getBanners();
  }

  @Get('banners/manage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all banners' })
  listBanners() {
    return this.cmsService.listBanners();
  }

  @Post('banners')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create banner' })
  createBanner(@Body() data: CreateBannerDto) {
    return this.cmsService.createBanner(data);
  }

  @Put('banners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update banner' })
  updateBanner(@Param('id') id: string, @Body() data: UpdateBannerDto) {
    return this.cmsService.updateBanner(id, data);
  }

  @Delete('banners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete banner' })
  deleteBanner(@Param('id') id: string) {
    return this.cmsService.deleteBanner(id);
  }

  @Get('sections')
  @ApiOperation({ summary: 'Get active sections, optional ?pageSlug= filter' })
  getSections(@Query('pageSlug') pageSlug?: string) {
    return this.cmsService.getSections(pageSlug);
  }

  @Get('sections/manage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List sections, optional ?pageSlug= filter' })
  listSections(@Query('pageSlug') pageSlug?: string) {
    return this.cmsService.listSections(pageSlug);
  }

  @Post('sections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create section' })
  createSection(@Body() data: CreateSectionDto) {
    return this.cmsService.createSection(data);
  }

  @Put('sections/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update section' })
  updateSection(@Param('id') id: string, @Body() data: UpdateSectionDto) {
    return this.cmsService.updateSection(id, data);
  }

  @Delete('sections/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete section' })
  deleteSection(@Param('id') id: string) {
    return this.cmsService.deleteSection(id);
  }

  @Post('sections/seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seed default sections (Super Admin only)' })
  seedSections() {
    return this.cmsService.seedSections();
  }

  @Post('pages/seed-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upsert all platform pages into cms_pages table' })
  seedAllPages() {
    return this.cmsService.seedAllPages();
  }

  @Post('sections/reset-seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Wipe cms_sections for a given pageSlug and re-seed correct sections' })
  resetAndSeedSectionsBySlug(@Body() body: { slug: string }) {
    return this.cmsService.resetAndSeedSectionsBySlug(body.slug);
  }

  @Get('pages/:slug')
  @ApiOperation({ summary: 'Get CMS page by slug' })
  getPage(@Param('slug') slug: string) {
    return this.cmsService.getPage(slug);
  }

  @Get('pages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all CMS pages (admin)' })
  listPages() {
    return this.cmsService.listPages();
  }

  @Post('pages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create CMS page' })
  createPage(@Body() data: any) {
    return this.cmsService.createPage(data);
  }

  @Put('pages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update CMS page' })
  updatePage(@Param('id') id: string, @Body() data: any) {
    return this.cmsService.updatePage(id, data);
  }

  @Delete('pages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete CMS page' })
  deletePage(@Param('id') id: string) {
    return this.cmsService.deletePage(id);
  }

  // ==================== FOOTER MANAGEMENT ====================

  @Get('footer')
  @ApiOperation({ summary: 'Get footer data' })
  getFooter() {
    return this.cmsService.getFooter();
  }

  @Get('footer/sections/manage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all footer sections' })
  listFooterSections() {
    return this.cmsService.listFooterSections();
  }

  @Post('footer/sections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create footer section' })
  createFooterSection(@Body() data: CreateFooterSectionDto) {
    return this.cmsService.createFooterSection(data);
  }

  @Put('footer/sections/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update footer section' })
  updateFooterSection(@Param('id') id: string, @Body() data: UpdateFooterSectionDto) {
    return this.cmsService.updateFooterSection(id, data);
  }

  @Delete('footer/sections/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete footer section' })
  deleteFooterSection(@Param('id') id: string) {
    return this.cmsService.deleteFooterSection(id);
  }

  @Post('footer/links')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create footer link' })
  createFooterLink(@Body() data: CreateFooterLinkDto) {
    return this.cmsService.createFooterLink(data);
  }

  @Put('footer/links/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update footer link' })
  updateFooterLink(@Param('id') id: string, @Body() data: UpdateFooterLinkDto) {
    return this.cmsService.updateFooterLink(id, data);
  }

  @Delete('footer/links/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete footer link' })
  deleteFooterLink(@Param('id') id: string) {
    return this.cmsService.deleteFooterLink(id);
  }

  @Get('footer-config')
  @ApiOperation({ summary: 'Get footer config' })
  getFooterConfigPublic() {
    return this.cmsService.getFooterConfig();
  }

  @Get('footer-sections')
  @ApiOperation({ summary: 'Get footer sections' })
  getFooterSectionsPublic() {
    return this.cmsService.getFooterSections();
  }

  @Get('footer/config')
  @ApiOperation({ summary: 'Get footer config' })
  getFooterConfig() {
    return this.cmsService.getFooterConfig();
  }

  @Put('footer/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update footer config' })
  updateFooterConfig(@Body() data: UpdateFooterConfigDto) {
    return this.cmsService.updateFooterConfig(data);
  }

  @Post('footer/seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seed default footer data (Super Admin only)' })
  seedFooter() {
    return this.cmsService.seedFooter();
  }

  // ==================== SITE CONFIG ====================

  @Get('site-config')
  @ApiOperation({ summary: 'Get all site config entries' })
  getAllSiteConfigs() {
    return this.cmsService.getAllSiteConfigs();
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
  @ApiOperation({ summary: 'Upsert site config by key' })
  upsertSiteConfig(@Param('key') key: string, @Body() body: { value: any }) {
    return this.cmsService.upsertSiteConfig(key, body.value);
  }

  @Post('site-config/seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seed default site configs' })
  seedSiteConfigs() {
    return this.cmsService.seedSiteConfigs();
  }

  // ==================== BRAND BANNERS ====================

  @Get('brand-banners')
  @ApiOperation({ summary: 'Get active brand banners' })
  getBrandBanners() {
    return this.cmsService.getBrandBanners(true);
  }

  @Get('brand-banners/manage')
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
}
