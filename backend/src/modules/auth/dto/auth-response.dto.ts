import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() displayName: string;
  @ApiProperty({ nullable: true }) avatarUrl: string | null;
  @ApiProperty({ enum: UserRole }) role: UserRole;
  @ApiProperty() timezone: string;
  @ApiProperty() locale: string;
  @ApiProperty() pointsBalance: number;
  @ApiProperty() createdAt: Date;
}

export class AuthTokensDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty({ example: 900, description: 'Access token lifetime in seconds' })
  expiresIn: number;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserResponseDto }) user: UserResponseDto;
  @ApiProperty({ type: AuthTokensDto }) tokens: AuthTokensDto;
}
