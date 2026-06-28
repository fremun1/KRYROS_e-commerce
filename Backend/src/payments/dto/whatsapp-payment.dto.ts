import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class WhatsAppPaymentDto {
  @ApiProperty({ description: 'Customer phone number', example: '0971234567', required: false })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Payment amount', example: 500 })
  @IsNumber()
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

  @ApiProperty({ description: 'Payment reference ID', example: 'PAY-ABC123' })
  @Transform(({ value }) => value?.trim())
  @IsString()
  reference: string;

  @ApiProperty({ description: 'Optional payment link id', required: false })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  paymentLinkId?: string;
}
