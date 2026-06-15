import { IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateSectionDto {
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  type?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  title?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  subtitle?: string;

  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/ban-types
  config?: object;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
