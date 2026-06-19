import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResolveDisputeDto {
  @ApiProperty({ example: 'Credit refunded to expert. No-show recorded.' })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  resolution: string;
}
