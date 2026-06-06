import { IsString, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Electronics' })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'electronics', required: false })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  parentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false, description: 'Show on homepage (alias: showOnHome)' })
  @IsOptional()
  @IsBoolean()
  showOnHomepage?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  showOnHome?: boolean;
}
