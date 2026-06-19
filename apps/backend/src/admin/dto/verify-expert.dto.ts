import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationStatus } from '@prisma/client';

export class VerifyExpertDto {
  @ApiProperty({ enum: [VerificationStatus.VERIFIED, VerificationStatus.REJECTED] })
  @IsEnum([VerificationStatus.VERIFIED, VerificationStatus.REJECTED])
  status: VerificationStatus.VERIFIED | VerificationStatus.REJECTED;

  @ApiPropertyOptional({ example: 'Tazkira image is unclear. Please resubmit.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
