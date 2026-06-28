import { IsString, IsNumber, IsPositive, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DirectPaymentDto {
  @ApiProperty({ description: 'Customer name', example: 'John Doe', required: false })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiProperty({ description: 'Customer email', example: 'john.doe@example.com', required: false })
  @IsString()
  @IsOptional()
  customerEmail?: string;

  @ApiProperty({ description: 'Processing fee', example: 10.00, required: false })
  @IsNumber()
  @IsOptional()
  fee?: number;

  @ApiProperty({ description: 'Total amount paid including fee', example: 510.00, required: false })
  @IsNumber()
  @IsOptional()
  totalPaid?: number;

  @ApiProperty({ description: 'Unique receipt number', example: 'REC-ABC123', required: false })
  @IsString()
  @IsOptional()
  receiptNumber?: string;

  @ApiProperty({ description: 'Timestamp when the payment was successfully made', required: false })
  @IsOptional()
  paidAt?: Date;

  @ApiProperty({ description: 'Internal notes by admin for manual payments', required: false })
  @IsString()
  @IsOptional()
  adminNotes?: string;

  @ApiProperty({ description: 'Publicly shareable link for tracking payment status', required: false })
  @IsString()
  @IsOptional()
  trackingLink?: string;

  @ApiProperty({ description: 'ID of the associated order', required: false })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiProperty({ description: 'Payment method used (e.g., MOBILE_MONEY, WHATSAPP, BANK_TRANSFER)', example: 'MOBILE_MONEY', required: false })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ description: 'Name of the payment provider (e.g., MTN, Airtel, Zamtel, Bank Name)', example: 'MTN', required: false })
  @IsString()
  @IsOptional()
  providerName?: string;

  @ApiProperty({ description: 'Name of the payment network (e.g., MTN, Airtel, Zamtel)', example: 'MTN', required: false })
  @IsString()
  @IsOptional()
  networkName?: string;
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

  @ApiProperty({ description: 'Original amount before conversion', example: 20.00, required: false })
  @IsNumber()
  @IsOptional()
  originalAmount?: number;

  @ApiProperty({ description: 'Original currency before conversion', example: 'USD', required: false })
  @IsString()
  @IsOptional()
  originalCurrency?: string;
}
