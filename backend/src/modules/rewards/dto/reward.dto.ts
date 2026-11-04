import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RewardType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRewardDto {
  @ApiProperty({ example: '1 hour extra screen time' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @ApiPropertyOptional({ example: 'Watch a movie on Saturday' })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @ApiProperty({ enum: RewardType, default: RewardType.SCREEN_TIME })
  @IsEnum(RewardType)
  type: RewardType;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(1)
  pointCost: number;

  @ApiPropertyOptional({ example: 60, description: 'Minutes granted for time-based rewards' })
  @IsOptional()
  @IsInt()
  @Min(0)
  valueMinutes?: number;

  @ApiPropertyOptional({ example: 'com.instagram.android' })
  @IsOptional()
  @IsString()
  targetPackage?: string;

  @ApiPropertyOptional({ example: 'movie' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;
}

export class UpdateRewardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  pointCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  valueMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;
}

export class RedeemRewardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class DecideRedemptionDto {
  @ApiProperty({ description: 'true to approve, false to deny' })
  @IsBoolean()
  approve: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class AwardPointsDto {
  @ApiProperty({ description: 'Points to grant (may be positive or negative)' })
  @IsInt()
  points: number;

  @ApiProperty({ example: 'Completed chores' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  reason: string;

  @ApiPropertyOptional({ description: 'Household the grant belongs to' })
  @IsOptional()
  @IsString()
  householdId?: string;

  @ApiPropertyOptional({
    description:
      'Member to award. Defaults to the caller; guardians may target any active member of the household.',
  })
  @IsOptional()
  @IsString()
  targetUserId?: string;
}
