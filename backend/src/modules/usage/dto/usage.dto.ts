import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class UsageAppEntryDto {
  @ApiProperty({ example: 'com.instagram.android' })
  @IsString()
  packageName: string;

  @ApiPropertyOptional({ example: 'Instagram' })
  @IsOptional()
  @IsString()
  appName?: string;

  @ApiPropertyOptional({ example: 'SOCIAL' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: 1830, description: 'Foreground seconds for the day' })
  @IsInt()
  @Min(0)
  totalSeconds: number;

  @ApiPropertyOptional({ example: 24 })
  @IsOptional()
  @IsInt()
  @Min(0)
  launches?: number;

  @ApiPropertyOptional({ example: '2026-10-17T20:14:00.000Z' })
  @IsOptional()
  @IsISO8601()
  lastUsedAt?: string;
}

export class UsageSummaryDto {
  @ApiPropertyOptional({ example: 14520 })
  @IsOptional()
  @IsInt()
  @Min(0)
  screenTimeSeconds?: number;

  @ApiPropertyOptional({ example: 62 })
  @IsOptional()
  @IsInt()
  @Min(0)
  pickups?: number;

  @ApiPropertyOptional({ example: 148 })
  @IsOptional()
  @IsInt()
  @Min(0)
  notifications?: number;

  @ApiPropertyOptional({ example: 71 })
  @IsOptional()
  @IsInt()
  @Min(0)
  unlocks?: number;

  @ApiPropertyOptional({ example: 3600 })
  @IsOptional()
  @IsInt()
  @Min(0)
  focusSeconds?: number;
}

export class IngestUsageDto {
  @ApiProperty({ description: 'The device reporting the data' })
  @IsString()
  deviceId: string;

  @ApiProperty({ example: '2026-10-17', description: 'UTC calendar day (YYYY-MM-DD)' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;

  @ApiProperty({ type: [UsageAppEntryDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => UsageAppEntryDto)
  apps: UsageAppEntryDto[];

  @ApiPropertyOptional({ type: UsageSummaryDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UsageSummaryDto)
  summary?: UsageSummaryDto;
}

export class UsageRangeQueryDto {
  @ApiProperty({ description: 'Device id' })
  @IsString()
  deviceId: string;

  @ApiProperty({ example: '2026-10-11' })
  @IsDateString()
  from: string;

  @ApiProperty({ example: '2026-10-17' })
  @IsDateString()
  to: string;
}

export class UsageDayQueryDto {
  @ApiProperty({ description: 'Device id' })
  @IsString()
  deviceId: string;

  @ApiPropertyOptional({ example: '2026-10-17', description: 'Defaults to today (UTC)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;
}

export class TopAppsQueryDto extends UsageDayQueryDto {
  @ApiPropertyOptional({ default: 5, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 5;
}
