import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, Platform } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterPushTokenDto {
  @ApiPropertyOptional({ description: 'Device the token belongs to' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ description: 'Expo/FCM push token' })
  @IsString()
  @MaxLength(255)
  pushToken: string;

  @ApiPropertyOptional({ enum: Platform })
  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;
}

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  title: string;

  @ApiProperty()
  @IsString()
  @MaxLength(400)
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  data?: Record<string, unknown>;
}

export class NotificationsQueryDto {
  @ApiPropertyOptional({ description: 'Only return unread notifications' })
  @IsOptional()
  @IsString()
  unread?: string;
}
