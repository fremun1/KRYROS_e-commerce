import { IsString, IsNumber, IsPositive, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DirectPaymentDto {
  @ApiProperty({ description: 'Customer mobile number (07XXXXXXXX or 09XXXXXXXX)', example: '0971234567' })
  @Transform(({ value }) => value?.trim())
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Payment amount in ZMW', example: 500 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @ApiProperty({ description: 'Currency code', example: 'ZMW', required: false })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ description: 'Optional note or reference', required: false })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  note?: string;
}
