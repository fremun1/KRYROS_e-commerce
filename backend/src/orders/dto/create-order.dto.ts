import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, ValidateNested, ValidateIf } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class OrderItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @IsUUID()
  @IsOptional()
  variantId?: string;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity!: number;
}

export class AddressDetailsDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  email!: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  address!: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  zipCode?: string;

  @IsUUID()
  @IsOptional()
  countryId?: string | null;

  @IsUUID()
  @ValidateIf((o) => !o.manual)
  @IsOptional()
  stateId?: string | null;

  @IsUUID()
  @ValidateIf((o) => !o.manual)
  @IsOptional()
  cityId?: string | null;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  stateName?: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  cityName?: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  countryName?: string;

  @IsBoolean()
  @IsOptional()
  manual?: boolean;
}

export class CreateOrderDto {
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsUUID()
  @IsOptional()
  shippingAddressId?: string;

  @IsUUID()
  @IsOptional()
  billingAddressId?: string;

  @IsUUID()
  @IsOptional()
  shippingMethodId?: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  paymentMethod!: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  paymentPhone?: string;

  @IsOptional()
  totalZMW?: number;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  currencyCode?: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  currencySymbol?: string;

  @IsOptional()
  exchangeRate?: number;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDetailsDto)
  addressDetails?: AddressDetailsDto;
}
