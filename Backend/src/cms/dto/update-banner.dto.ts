import { IsBoolean, IsInt, IsOptional, IsString, Min, IsISO8601 } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateBannerDto {
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  title?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  subtitle?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  mediaType?: string; // "image" or "video"

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  link?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  linkText?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number; // Duration in seconds for video banners

  @IsOptional()
  @IsInt()
  @Min(1)
  displayDays?: number; // How many days to display this banner

  @IsOptional()
  @IsISO8601()
  startDate?: string | null;

  @IsOptional()
  @IsISO8601()
  endDate?: string | null;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  tag?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  secondaryCta?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  secondaryCtaLink?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  badge?: string;
}
