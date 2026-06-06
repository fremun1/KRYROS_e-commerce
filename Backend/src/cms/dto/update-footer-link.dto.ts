import { IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateFooterLinkDto {
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  label?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  href?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
