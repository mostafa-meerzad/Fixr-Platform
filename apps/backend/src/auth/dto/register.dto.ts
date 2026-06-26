import { IsString, IsEnum, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@fixr/shared';

export class RegisterDto {
  @ApiProperty({ example: '+93701234567' })
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/)
  phone: string;

  @ApiProperty({ example: 'Ahmad Karimi' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @ApiProperty({ enum: [UserRole.HOMEOWNER, UserRole.EXPERT] })
  @IsEnum([UserRole.HOMEOWNER, UserRole.EXPERT])
  role: UserRole.HOMEOWNER | UserRole.EXPERT;

  @ApiProperty({ example: 'otp-session-id-from-verify-step' })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({ example: 'clx_zone1', description: 'Required when role = HOMEOWNER' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiPropertyOptional({ example: '12th Street, House No. 102', description: 'Required when role = HOMEOWNER' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;
}
