import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyWholesaleDto {
  @ApiProperty({ example: 'Lusaka Electronics Ltd.' })
  @Transform(({ value }) => value?.trim())
  @IsString()
  companyName: string;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ example: 'Plot 15, Cairo Road, Lusaka' })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  discountTier?: number;
}
