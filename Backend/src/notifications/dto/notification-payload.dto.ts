import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsObject, IsDateString, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';

export enum NotificationTargetType {
  SINGLE = 'SINGLE',
  BULK = 'BULK',
  STATUS_BASED = 'STATUS_BASED',
  ALL = 'ALL',
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

  /**
   * Optional deep-link URL. When the user taps the notification, the app
   * will navigate to this URL (absolute or relative to the frontend base URL).
   * Examples:
   *   - https://kryros.com/product/some-slug
   *   - /shop/category/phones
   *   - /track?orderNumber=ORD-001
   */
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  url?: string;

  /**
   * Optional banner image URL to display inside the notification.
   * Must be a publicly accessible HTTPS URL (Cloudinary recommended).
   */
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsObject()
  @IsOptional()
  data?: any;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}
