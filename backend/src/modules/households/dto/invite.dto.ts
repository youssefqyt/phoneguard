import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HouseholdRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateInviteDto {
  @ApiPropertyOptional({ example: 'child@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: HouseholdRole, default: HouseholdRole.CHILD })
  @IsOptional()
  @IsIn([HouseholdRole.CHILD, HouseholdRole.PARENT, HouseholdRole.VIEWER])
  role?: HouseholdRole;

  @ApiPropertyOptional({ default: 7, description: 'Days until the invite expires' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays?: number;
}

export class AcceptInviteDto {
  @ApiProperty({ example: 'Xk9f2Qp7' })
  @IsString()
  code: string;
}

export class AddMemberDto {
  @ApiProperty({ description: 'User id or email of the person to add' })
  @IsString()
  user: string;

  @ApiProperty({ enum: HouseholdRole })
  @IsEnum(HouseholdRole)
  role: HouseholdRole;
}

export class UpdateMemberDto {
  @ApiProperty({ enum: HouseholdRole })
  @IsEnum(HouseholdRole)
  role: HouseholdRole;
}
