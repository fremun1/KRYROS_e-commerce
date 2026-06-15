import { IsString, IsBoolean, IsOptional, IsNumber, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateLocationShippingMethodDto {
  @IsUUID()
  zoneId: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  name: string;

  @IsNumber()
  price: number;

  @IsNumber()
  @IsOptional()
  freeShippingThreshold?: number;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  estimatedDays?: string;

  @IsBoolean()
  @IsOptional()
  status?: boolean;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
