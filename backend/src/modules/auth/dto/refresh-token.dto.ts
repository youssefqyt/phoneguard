import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'A valid refresh token issued by /auth/login' })
  @IsString()
  @MinLength(10)
  refreshToken: string;
}
