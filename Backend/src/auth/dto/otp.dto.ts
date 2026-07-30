import { IsString, IsNotEmpty, IsEmail, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ description: 'Email address to send the OTP to' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ description: 'Email address associated with the OTP' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: '6-digit OTP code' })
  @IsString()
  @Length(6, 6)
  @IsNotEmpty()
  code!: string;
}
