import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  salePrice?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  weight?: string;

  @IsOptional()
  @IsString()
  categorySlug?: string;

  @IsOptional()
  @IsString()
  brandSlug?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  brandId?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  allowCredit?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  creditMinimum?: number;

  @IsOptional()
  @IsString()
  creditMessage?: string;

  @IsOptional()
  @IsString()
  deliveryInfo?: string;

  @IsOptional()
  @IsString()
  warrantyInfo?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isNew?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isTrending?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isHot?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isBestSeller?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discountPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stockTotal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stockCurrent?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  hasFiveYearGuarantee?: boolean;

  @IsOptional()
  @IsString()
  fiveYearGuaranteeText?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isFlashSale?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  flashSalePrice?: number;

  @IsOptional()
  @IsString()
  flashSaleEnd?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  hasFreeReturns?: boolean;

  @IsOptional()
  @IsString()
  freeReturnsText?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  hasInstallmentOptions?: boolean;

  @IsOptional()
  @IsString()
  installmentOptionsText?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  fullyTested?: boolean;

  @IsOptional()
  @IsString()
  fullyTestedText?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  rating?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  reviewCount?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isWholesaleOnly?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  unitsPerPack?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  wholesaleMoq?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  wholesalePrice?: number;

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @IsString()
  upsellProductId?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  replaceImages?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateIf((o) => Array.isArray(o.imageDataUrls))
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
  @Type(() => Number)
  estimatedDeliveryMinDays?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  estimatedDeliveryMaxDays?: number;
}
