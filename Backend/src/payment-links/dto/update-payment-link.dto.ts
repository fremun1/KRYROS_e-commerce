import { PartialType } from '@nestjs/swagger';
import { CreatePaymentLinkDto } from './create-payment-link.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePaymentLinkDto extends PartialType(CreatePaymentLinkDto) {
  @ApiProperty({ description: 'Whether the payment link is active', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
