import {
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
  IsDateString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Urgency } from '@prisma/client';

export class CreateJobDto {
  @ApiProperty({ example: 'Kitchen sink leaking badly' })
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: 'Water dripping constantly from under the cabinet.' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @ApiProperty()
  @IsString()
  categoryId: string;

  @ApiProperty()
  @IsString()
  zoneId: string;

  @ApiProperty({ example: 'Karte Seh, near the blue mosque' })
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  address: string;

  @ApiProperty({ enum: Urgency })
  @IsEnum(Urgency)
  urgency: Urgency;

  @ApiPropertyOptional({ description: 'Required when urgency is SCHEDULED' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
