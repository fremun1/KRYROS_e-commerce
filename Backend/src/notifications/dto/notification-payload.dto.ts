import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsObject, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export enum NotificationTargetType {
  SINGLE = 'SINGLE',
  BULK = 'BULK',
  STATUS_BASED = 'STATUS_BASED',
}

export class SendNotificationDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  title: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  body: string;

  @IsEnum(NotificationTargetType)
  @IsNotEmpty()
  targetType: NotificationTargetType;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  userId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  orderIds?: string[];

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  orderStatus?: string;

  @IsObject()
  @IsOptional()
  data?: any;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}
