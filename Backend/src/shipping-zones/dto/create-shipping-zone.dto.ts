import { IsString, IsBoolean, IsOptional, IsInt, IsUUID, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateShippingZoneDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  name: string;

  @IsUUID()
  @IsOptional()
  countryId?: string;

  @IsUUID()
  @IsOptional()
  stateId?: string;

  @IsUUID()
  @IsOptional()
  cityId?: string;

  @IsInt()
  @IsOptional()
  priority?: number;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  region?: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  shippingMethod?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  rate?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  minOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
