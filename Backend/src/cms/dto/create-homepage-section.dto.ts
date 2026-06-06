import { IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateHomePageSectionDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  type: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

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
  description?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  backgroundColor?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  textColor?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

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
  // eslint-disable-next-line @typescript-eslint/ban-types
  config?: object;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  animation?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  targetCategoryId?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  targetCategorySlug?: string;
}
