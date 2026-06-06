import { IsString, IsNumber, IsPositive } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class InitializePaymentDto {
  @ApiProperty({ description: 'The order ID to process payment for', example: 'uuid-here' })
  @Transform(({ value }) => value?.trim())
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Customer mobile number in Zambian format (07XXXXXXXX or 09XXXXXXXX)', example: '0971234567' })
  @Transform(({ value }) => value?.trim())
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Payment amount in ZMW', example: 500 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount: number;
}
