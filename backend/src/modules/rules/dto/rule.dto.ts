import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RuleAction, RuleType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateRuleDto {
  @ApiPropertyOptional({ description: 'Attach to a household (guardian only)' })
  @IsOptional()
  @IsString()
  householdId?: string;

  @ApiPropertyOptional({ description: 'Attach to a specific device' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ example: 'Social media limit' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiProperty({ enum: RuleType })
  @IsEnum(RuleType)
  type: RuleType;

  @ApiPropertyOptional({ enum: RuleAction, default: RuleAction.BLOCK })
  @IsOptional()
  @IsEnum(RuleAction)
  action?: RuleAction;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiProperty({
    description: 'Type-specific configuration object',
    examples: {
      APP_LIMIT: { value: { packages: ['com.instagram.android'], dailyLimitMinutes: 30 } },
      CATEGORY_LIMIT: { value: { category: 'SOCIAL', dailyLimitMinutes: 45 } },
      BLOCKLIST: { value: { packages: ['com.tiktok.musically'] } },
      SCHEDULE: { value: { days: [1, 2, 3, 4, 5], startTime: '22:00', endTime: '07:00' } },
    },
  })
  @IsObject()
  config: Record<string, unknown>;
}

export class UpdateRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ enum: RuleAction })
  @IsOptional()
  @IsEnum(RuleAction)
  action?: RuleAction;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  deviceId?: string | null;
}

export class RuleQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  householdId?: string;

  @ApiPropertyOptional({ enum: RuleType })
  @IsOptional()
  @IsEnum(RuleType)
  type?: RuleType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
