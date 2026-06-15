import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWholesaleApplicationStatusDto {
  @ApiProperty({ description: 'New status for the wholesale application', example: 'APPROVED', enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status: string;

  @ApiPropertyOptional({ description: 'Optional notes for the status update', example: 'Application approved after review.' })
  @IsString()
  @IsOptional()
  notes?: string;
}
