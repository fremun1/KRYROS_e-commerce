import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateBrandDto {
  @ApiProperty()
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  website?: string;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  categoryId?: string;
}

export class UpdateBrandDto {
  @ApiProperty({ required: false })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  website?: string;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  categoryId?: string;
}
