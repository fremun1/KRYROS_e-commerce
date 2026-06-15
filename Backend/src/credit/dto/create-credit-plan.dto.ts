import { IsString, IsNumber, IsOptional, IsBoolean, IsPositive, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCreditPlanDto {
  @ApiProperty({ example: 'Standard 6-Month Plan' })
  @Transform(({ value }) => value?.trim())
  @IsString()
  name: string;

  @ApiProperty({ description: 'Repayment duration in months', example: 6 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  duration: number;

  @ApiProperty({ description: 'Annual interest rate as a percentage', example: 12.5 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  interestRate: number;

  @ApiProperty({ description: 'Minimum eligible purchase amount', example: 100 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minimumAmount: number;

  @ApiProperty({ description: 'Maximum eligible purchase amount', example: 5000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maximumAmount: number;

  @ApiPropertyOptional({ example: 'Flexible repayment over 6 months.' })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Restrict plan to a specific brand ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  targetBrandId?: number;

  @ApiPropertyOptional({ description: 'Restrict plan to a specific category ID' })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  targetCategoryId?: string;
}
