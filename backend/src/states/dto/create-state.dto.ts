import { IsString, IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateStateDto {
  @IsUUID()
  countryId: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  name: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  code?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
