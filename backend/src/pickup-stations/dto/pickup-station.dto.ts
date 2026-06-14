import { IsString, IsBoolean, IsOptional, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreatePickupStationDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  name: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  address: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  city: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  state?: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  country?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  phone?: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  email?: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  openingHours?: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  description?: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  image?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdatePickupStationDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  name?: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  address?: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  city?: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  state?: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  country?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  phone?: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  email?: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  openingHours?: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  description?: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  image?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
