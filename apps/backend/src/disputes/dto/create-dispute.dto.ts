import { IsEnum, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DisputeReason } from '@prisma/client';

export class CreateDisputeDto {
  @ApiProperty({ enum: DisputeReason })
  @IsEnum(DisputeReason)
  reason: DisputeReason;

  @ApiProperty({ example: 'The expert did not show up after accepting the bid.' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;
}
