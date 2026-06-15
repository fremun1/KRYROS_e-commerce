import { IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateFooterLinkDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  sectionId: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  label: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  href: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number = 0;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
