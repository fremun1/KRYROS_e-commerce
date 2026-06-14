import { IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateFooterSectionDto {
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
