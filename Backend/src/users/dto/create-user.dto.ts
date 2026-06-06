import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsNotEmpty, IsBoolean, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254, { message: 'Email must not exceed 254 characters' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  email?: string;

  @ApiProperty({ example: 'SecurePass@99' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  // Note: intentionally NOT trimmed — passwords may contain intentional leading/trailing spaces
  password!: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'First name must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Last name must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  lastName!: string;

  @ApiProperty({ example: '+260966423719' })
  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'Phone number must not exceed 30 characters' })
  @Matches(/^\+?[0-9\s\-().]{7,30}$/, {
    message: 'Phone number must be a valid international format (e.g. +260966423719)',
  })
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @ApiProperty({ example: 'CUSTOMER', enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ example: 'data:image/jpeg;base64,...' })
  @IsOptional()
  @IsString()
  @MaxLength(5_000_000, { message: 'Avatar image is too large' })
  avatar?: string;

  @ApiProperty({ example: '03AGdBq25...reCAPTCHA v3 token from client', required: false })
  @IsOptional()
  @IsString()
  captchaToken?: string;
}
