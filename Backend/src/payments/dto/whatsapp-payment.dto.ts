import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class WhatsAppPaymentDto {
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

  @ApiProperty({ description: 'Payment method used (e.g., MOBILE_MONEY, WHATSAPP, BANK_TRANSFER)', example: 'WHATSAPP', required: false })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ description: 'Name of the payment provider (e.g., MTN, Airtel, Zamtel, Bank Name)', example: 'WhatsApp', required: false })
  @IsString()
  @IsOptional()
  providerName?: string;

  @ApiProperty({ description: 'Name of the payment network (e.g., MTN, Airtel, Zamtel)', example: 'WhatsApp', required: false })
  @IsString()
  @IsOptional()
  networkName?: string;
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

  @ApiProperty({ description: 'Original amount before conversion', required: false })
  @IsNumber()
  @IsOptional()
  originalAmount?: number;

  @ApiProperty({ description: 'Original currency before conversion', required: false })
  @IsString()
  @IsOptional()
  originalCurrency?: string;
}
