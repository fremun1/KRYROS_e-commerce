import { IsString, IsOptional, IsNumber, IsBoolean, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateServiceDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  name: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  slug: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  description?: string;

  @IsNumber()
  price: number;

  @Transform(({ value }) => value?.trim())
  @IsString()
  category: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  duration: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsArray()
  features?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
