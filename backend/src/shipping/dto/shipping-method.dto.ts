import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateShippingMethodDto {
  @ApiProperty()
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  fee: number;

  @ApiProperty({ default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minThreshold?: number;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  estimatedDays?: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiProperty({ required: false, default: 0 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;
}

export class UpdateShippingMethodDto {
  @ApiProperty({ required: false })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  fee?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minThreshold?: number;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  estimatedDays?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;
}
