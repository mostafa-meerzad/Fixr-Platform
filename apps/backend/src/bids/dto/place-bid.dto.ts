import {
  IsInt,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlaceBidDto {
  @ApiProperty({ example: 1500, description: 'Price in AFN' })
  @IsInt()
  @Min(1)
  price: number;

  @ApiProperty({ example: 30, description: 'Estimated arrival in minutes' })
  @IsInt()
  @Min(5)
  @Max(480)
  estimatedArrivalMinutes: number;

  @ApiProperty({ example: 2.5, description: 'Estimated job duration in hours' })
  @IsNumber()
  @Min(0.25)
  @Max(72)
  estimatedDurationHours: number;

  @ApiPropertyOptional({ example: '1 month parts and labour warranty' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  warrantyDescription?: string;

  @ApiPropertyOptional({ example: 'I have the parts in my van, quick fix.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  expertMessage?: string;
}
