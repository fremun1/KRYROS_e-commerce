import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  platform?: string;
}
