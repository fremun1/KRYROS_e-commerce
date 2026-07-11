import { IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSectionDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  type: string; // e.g., 'testimonials'

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  pageSlug?: string; // which page this section belongs to (e.g. 'shop', 'about-us')

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  title?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  subtitle?: string;

  // config will be sent as JSON in body; let ValidationPipe transform it
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/ban-types
  config?: object;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsString()
  dedicatedPageSlug?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  // New fields for dynamic section system
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  templateType?: string; // ProductShelf, BannerSlot, CategoryGrid, etc.

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  dataSourceId?: string; // Rule ID: top-selling, trending-products, flash-sales, etc.

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  slotKey?: string; // For banners: homepage-hero-slider, homepage-mid-page, etc.
}
