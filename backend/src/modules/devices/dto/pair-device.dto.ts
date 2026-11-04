import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class PairDeviceDto {
  @ApiProperty({
    example: 'K7QM4XPT',
    description: 'The pairing code displayed on the managed device',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(12)
  code: string;

  @ApiPropertyOptional({
    description: 'Household to attach the device to (defaults to the guardian household)',
  })
  @IsOptional()
  @IsString()
  householdId?: string;
}

export class UpdateDeviceDto {
  @ApiPropertyOptional({ example: "Sam's Pixel 8" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ description: 'Expo/FCM push token for notifications' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  pushToken?: string;

  @ApiPropertyOptional({ example: '1.0.1' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  appVersion?: string;

  @ApiPropertyOptional({ example: '14' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  osVersion?: string;
}
