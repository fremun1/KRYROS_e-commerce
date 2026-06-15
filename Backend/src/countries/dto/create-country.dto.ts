import { IsString, IsBoolean, IsOptional, IsNumber, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum SymbolPosition {
  BEFORE = 'BEFORE',
  AFTER = 'AFTER',
}

export class CreatePaymentMethodDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  name: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateCountryDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  name: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  code: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  currencyCode: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  currencySymbol: string;

  @IsEnum(SymbolPosition)
  @IsOptional()
  symbolPosition?: SymbolPosition;

  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  @IsBoolean()
  @IsOptional()
  autoRate?: boolean;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  flag?: string;

  @IsBoolean()
  @IsOptional()
  status?: boolean;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  shippingEnabled?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentMethodDto)
  paymentMethods?: CreatePaymentMethodDto[];
}
