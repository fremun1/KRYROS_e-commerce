import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  sku!: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price!: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  weight?: number;

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
  isFlashSale?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isNew?: boolean;

  // ── Credit / "Get Now Pay Later" fields ───────────────────────────────────
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  allowCredit?: boolean;

  @IsString()
  @IsOptional()
  creditMessage?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  creditMinimum?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  creditDuration?: number;

  @IsString()
  @IsOptional()
  creditDurationType?: string;

  @IsString()
  @IsOptional()
  creditInstallmentFrequency?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  creditInstallmentCount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  creditInstallmentAmount?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  flashSalePrice?: number;

  @IsString()
  @IsOptional()
  flashSaleEnd?: string;

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

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  estimatedDeliveryMinDays?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  estimatedDeliveryMaxDays?: number;

  @IsString()
  @IsOptional()
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

  @IsString()
  @IsOptional()
  metaTitle?: string;

  @IsString()
  @IsOptional()
  metaDescription?: string;

  @IsString()
  @IsOptional()
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

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  replaceImages?: boolean;


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
}
