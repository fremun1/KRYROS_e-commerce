import { IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Email address or phone number of the account' })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  identifier!: string;
}
