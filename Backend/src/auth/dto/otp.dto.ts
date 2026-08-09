import { IsString, IsNotEmpty, IsEmail, Length, IsOptional, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ description: 'Email address or phone number to send the OTP to' })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @ApiProperty({ description: 'Country code (e.g., ZM for Zambia)', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Transform(({ value }) => value?.toUpperCase())
  countryCode?: string;

  @ApiProperty({ description: 'Optional email for Zambia dual-identifier registration', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ description: 'Optional phone for Zambia dual-identifier registration', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class VerifyOtpDto {
  @ApiProperty({ description: 'Email address or phone number associated with the OTP' })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @ApiProperty({ description: '6-digit OTP code' })
  @IsString()
  @Length(6, 6)
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ description: 'User password (for completing registration)', required: false })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ description: 'User first name (for completing registration)', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ description: 'User last name (for completing registration)', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ description: 'User Date of Birth (optional)', required: false })
  @IsOptional()
  @IsString()
  dob?: string;
}
