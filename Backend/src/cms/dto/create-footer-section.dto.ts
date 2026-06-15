import { IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateFooterSectionDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  title: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number = 0;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
