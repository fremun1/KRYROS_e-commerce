import { IsString, IsNumber, IsPositive, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DirectPaymentDto {
  @ApiProperty({ description: 'Customer mobile number (07XXXXXXXX or 09XXXXXXXX)', example: '0971234567', required: false })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : ''))
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Payment amount in ZMW', example: 500 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @ApiProperty({ description: 'Currency code', example: 'ZMW', required: false })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : ''))
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ description: 'Optional note or reference', required: false })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : ''))
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({ description: 'Optional payment link id', required: false })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : ''))
  @IsString()
  @IsOptional()
  paymentLinkId?: string;
}
