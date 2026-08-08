import { IsString, IsNotEmpty } from 'class-validator';

export class SetDefaultCountryDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}
