import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsString()
  sku!: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price!: number;

  @IsString()
  description!: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  @IsString()
  @IsOptional()
  categorySlug?: string;

  @IsString()
  @IsOptional()
  brandSlug?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  brandId?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isFeatured?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  allowCredit?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  creditMinimum?: number;

  @IsString()
  @IsOptional()
  creditMessage?: string;

  @IsString()
  @IsOptional()
  deliveryInfo?: string;

  @IsString()
  @IsOptional()
  warrantyInfo?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isNew?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isTrending?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isHot?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isBestSeller?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  discountPercentage?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  stockTotal?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  stockCurrent?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasFiveYearGuarantee?: boolean;

  @IsString()
  @IsOptional()
  fiveYearGuaranteeText?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isFlashSale?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  flashSalePrice?: number;

  @IsString()
  @IsOptional()
  flashSaleEnd?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasFreeReturns?: boolean;

  @IsString()
  @IsOptional()
  freeReturnsText?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasInstallmentOptions?: boolean;

  @IsString()
  @IsOptional()
  installmentOptionsText?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  fullyTested?: boolean;

  @IsString()
  @IsOptional()
  fullyTestedText?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  rating?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  reviewCount?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isWholesaleOnly?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  unitsPerPack?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  wholesaleMoq?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  wholesalePrice?: number;

  @IsString()
  @IsOptional()
  upsellProductId?: string;

  @IsArray()
  @ValidateIf((o) => Array.isArray(o.imageDataUrls))
  @IsOptional()
  imageDataUrls?: string[];

  @IsArray()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }
    return value;
  })
  specifications?: { key: string; value: string }[];

  @IsArray()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }
    return value;
  })
  variants?: { type: string; value: string; price?: string | number; stock?: string | number; sku?: string }[];

  @IsString()
  @IsOptional()
  condition?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  shippingFee?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  estimatedDeliveryDays?: number;

  @IsString()
  @IsOptional()
  @IsString()
  popularItemText?: string;

  @IsOptional()
  @IsString()
  easyReturnsText?: string;

  @IsOptional()
  @IsString()
  shippingTitle?: string;

  @IsOptional()
  @IsInt()
  estimatedDeliveryMinDays?: number;

  @IsOptional()
  @IsInt()
  estimatedDeliveryMaxDays?: number;
}
