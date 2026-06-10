import { IsString, IsOptional, IsInt, Min, Max, IsNotEmpty, IsEmail, IsPhoneNumber, IsUrl } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyWholesaleDto {
  @ApiProperty({ example: 'Lusaka Electronics Ltd.' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ example: 'retailer', enum: ['retailer', 'distributor', 'reseller', 'corporate', 'other'] })
  @IsString()
  @IsNotEmpty()
  businessType: string;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiPropertyOptional({ example: 'TAXID123' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ example: 'https://www.lusakaelectronics.com' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'john.doe@lusakaelectronics.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+260977123456' })
  @IsPhoneNumber('ZM')
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Sales Manager' })
  @IsString()
  @IsNotEmpty()
  jobTitle: string;

  @ApiProperty({ example: 'Plot 15, Cairo Road' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Lusaka' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({ example: 'Lusaka Province' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: 'Zambia' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiPropertyOptional({ example: '10101' })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional({ example: '+260966123456' })
  @IsOptional()
  @IsPhoneNumber('ZM')
  businessPhone?: string;

  @ApiPropertyOptional({ example: 'info@lusakaelectronics.com' })
  @IsOptional()
  @IsEmail()
  businessEmail?: string;

  @ApiPropertyOptional({ example: 500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  annualRevenue?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  employeeCount?: number;

  @ApiPropertyOptional({ example: 'Electronics, Home Appliances' })
  @IsOptional()
  @IsString()
  productCategories?: string;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  estimatedMonthlyOrder?: number;

  @ApiPropertyOptional({ example: 'We are a leading retailer looking to expand our product offerings.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  discountTier?: number;
}
