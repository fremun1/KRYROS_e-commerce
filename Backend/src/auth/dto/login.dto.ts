import { IsString, IsNotEmpty, IsOptional, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com or +260...' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  @Transform(({ value }) => value?.trim())
  identifier!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(128)
  password!: string;

  // Optional during migration — required once all client apps send the token
  @ApiProperty({ example: '03AGdBq25...reCAPTCHA v3 token from client', required: false })
  @IsOptional()
  @IsString()
  captchaToken?: string;
}
