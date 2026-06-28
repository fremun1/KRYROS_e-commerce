import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';

export class UpdateDirectPaymentStatusDto {
  @ApiProperty({ description: 'New status for the direct payment', enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @ApiProperty({ description: 'Optional admin notes for the status update', required: false })
  @IsString()
  @IsOptional()
  adminNotes?: string;
}
