import { IsString, IsInt, Min, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordPurchaseDto {
  @ApiProperty({ description: 'Expert user ID' })
  @IsString()
  expertUserId: string;

  @ApiProperty({ example: 10, description: 'Number of credits to grant' })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ example: 'Paid 500 AFN cash — receipt #42' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
