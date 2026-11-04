import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateHouseholdDto {
  @ApiProperty({ example: 'The Morgan Family' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;
}

export class UpdateHouseholdDto {
  @ApiPropertyOptional({ example: 'The Morgan Household' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;
}
