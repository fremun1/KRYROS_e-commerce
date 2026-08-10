import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min, ValidateIf, Allow } from 'class-validator';
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
  @Transform(({ value }) => (value === null || value === '' || value === undefined) ? null : Number(value))
  @Allow()
  salePrice?: number | null;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  weight?: number;

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
  isFlashSale?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isNew?: boolean;

  // ── Credit / "Get Now Pay Later" fields ───────────────────────────────────
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  allowCredit?: boolean;

  @IsOptional()
  @IsString()
  creditMessage?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  creditMinimum?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  creditDuration?: number;

  @IsOptional()
  @IsString()
  creditDurationType?: string;

  @IsOptional()
  @IsString()
  creditInstallmentFrequency?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  creditInstallmentCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  creditInstallmentAmount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  flashSalePrice?: number;

  @IsOptional()
  @IsString()
  flashSaleEnd?: string;

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
  @IsString()
  condition?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  shippingFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  estimatedDeliveryDays?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  estimatedDeliveryMinDays?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  estimatedDeliveryMaxDays?: number;

  @IsOptional()
  @IsString()
  popularItemText?: string;

  @IsOptional()
  @IsString()
  easyReturnsText?: string;

  @IsOptional()
  @IsString()
  freeReturnsDescription?: string;

  @IsOptional()
  @IsString()
  protectionDescription?: string;

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
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  wholesalePrice?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  wholesaleMoq?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  unitsPerPack?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isWholesaleOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  replaceImages?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateIf((o) => Array.isArray(o.imageDataUrls))
  imageDataUrls?: string[];

  @IsOptional()
  @IsArray()
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

  @IsOptional()
  @IsArray()
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
}
