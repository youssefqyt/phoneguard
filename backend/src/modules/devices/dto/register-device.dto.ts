import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Platform } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDeviceDto {
  @ApiProperty({ example: "Sam's Pixel 8" })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @ApiProperty({ enum: Platform, default: Platform.ANDROID })
  @IsEnum(Platform)
  platform: Platform;

  @ApiPropertyOptional({ example: 'Pixel 8' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  model?: string;

  @ApiPropertyOptional({ example: 'Google' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  manufacturer?: string;

  @ApiPropertyOptional({ example: '14' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  osVersion?: string;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  appVersion?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Enrol as a managed (child) device that guardians control',
  })
  @IsOptional()
  @IsBoolean()
  isManaged?: boolean;
}
