import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentLinkDto {
  @ApiProperty({ description: 'Link name or description', example: 'Order #1042 Payment' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Payment amount', example: 500 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Currency code', example: 'ZMW', default: 'ZMW' })
  @IsOptional()
  @IsString()
  currency?: string = 'ZMW';

  @ApiProperty({ description: 'Optional note or reference', example: 'Invoice #1042' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ description: 'Optional expiration date', example: '2026-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
