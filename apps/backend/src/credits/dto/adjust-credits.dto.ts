import { IsString, IsInt, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdjustCreditsDto {
  @ApiProperty({ description: 'Expert user ID' })
  @IsString()
  expertUserId: string;

  @ApiProperty({ example: 3, description: 'Positive to add, negative to deduct' })
  @IsInt()
  amount: number;

  @ApiPropertyOptional({ example: 'Manual adjustment after dispute resolution' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
