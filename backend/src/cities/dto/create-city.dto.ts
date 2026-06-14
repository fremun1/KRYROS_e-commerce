import { IsString, IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCityDto {
  @IsUUID()
  stateId: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  name: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
