import { IsString, IsOptional, IsArray, IsBoolean, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateFooterConfigDto {
  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  description?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  contactAddress?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  newsletterTitle?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  newsletterSubtitle?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  copyrightText?: string;

  @IsOptional()
  socialLinks?: any[];

  @IsOptional()
  paymentMethods?: any[];

  // Newsletter Popup Config
  @IsOptional()
  @IsBoolean()
  newsletterPopupEnabled?: boolean;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  newsletterPopupTitle?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  newsletterPopupSubtitle?: string;

  @IsOptional()
  @IsString()
  newsletterPopupImage?: string;

  @IsOptional()
  @IsNumber()
  newsletterPopupDelay?: number;

  // Announcement Bar Config
  @IsOptional()
  @IsBoolean()
  announcementBarEnabled?: boolean;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  announcementBarText?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  announcementBarLink?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  announcementBarBgColor?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  announcementBarTextColor?: string;
}
