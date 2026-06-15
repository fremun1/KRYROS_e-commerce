import { IsString, IsNumber, IsOptional, IsNotEmpty, IsEmail, IsPhoneNumber, IsIn, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyCreditDto {
  @ApiProperty({ description: 'ID of the product for which credit is being applied', example: 'prod_123' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'ID of the selected credit plan', example: 'plan_abc' })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({ description: 'Amount of credit requested', example: 5000 })
  @IsNumber()
  @Min(1)
  @Max(10000000) // Assuming a max credit amount
  amount: number;

  @ApiProperty({ description: 'First name of the applicant', example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'Last name of the applicant', example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'Email of the applicant', example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Phone number of the applicant', example: '+260977123456' })
  @IsPhoneNumber('ZM') // Assuming Zambia phone numbers
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'Address of the applicant', example: '123 Main St' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'City of the applicant', example: 'Lusaka' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'State or Province of the applicant', example: 'Lusaka Province' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ description: 'Country of the applicant', example: 'Zambia' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ description: 'Zip code of the applicant', example: '10101' })
  @IsString()
  @IsOptional()
  zipCode?: string;

  @ApiProperty({ description: 'Employment status of the applicant', example: 'employed', enum: ['employed', 'self-employed', 'unemployed', 'student', 'retired'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['employed', 'self-employed', 'unemployed', 'student', 'retired'])
  employmentStatus: string;

  @ApiProperty({ description: 'Monthly income of the applicant', example: 25000 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  monthlyIncome: number;

  @ApiProperty({ description: 'Employer name (if employed)', example: 'Tech Solutions Inc.' })
  @IsString()
  @IsOptional()
  employerName?: string;

  @ApiProperty({ description: 'Employer phone (if employed)', example: '+260977654321' })
  @IsPhoneNumber('ZM')
  @IsOptional()
  employerPhone?: string;
}
