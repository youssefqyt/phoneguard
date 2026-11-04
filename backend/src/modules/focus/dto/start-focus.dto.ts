import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StartFocusDto {
  @ApiProperty({ example: 45, description: 'Planned duration in minutes' })
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(480)
  plannedMinutes: number;

  @ApiPropertyOptional({ example: 'Study session' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Packages to block during the session',
    example: ['com.instagram.android', 'com.zhiliaoapp.musically'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  blockedPackages?: string[];
}
