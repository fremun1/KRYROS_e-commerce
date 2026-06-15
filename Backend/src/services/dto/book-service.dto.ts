import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BookServiceDto {
  @ApiProperty({ example: 'uuid-of-service' })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  serviceId!: string;

  @ApiProperty({ example: '2026-06-15' })
  @IsDateString()
  scheduledDate!: string;

  @ApiProperty({ example: '10:00' })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  scheduledTime!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  notes?: string;
}
