import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateReviewDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  rating: number;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  orderNumber?: string;
}

export class UpdateReviewStatusDto {
  @IsOptional()
  isApproved?: boolean;

  @IsOptional()
  isFeatured?: boolean;
}
