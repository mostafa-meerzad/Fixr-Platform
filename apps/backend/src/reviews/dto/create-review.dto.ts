import { IsInt, Min, Max, IsOptional, IsString, IsBoolean, IsArray, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 5, description: '1–5 star rating' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Great work, fast and clean.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @ApiPropertyOptional({ description: 'Mark as positive point for the reviewee' })
  @IsOptional()
  @IsBoolean()
  isPositive?: boolean;

  @ApiPropertyOptional({
    type: [String],
    example: ['Punctual', 'Quality work', 'Fair price'],
    description: 'Selected tag chips from the review UI',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
