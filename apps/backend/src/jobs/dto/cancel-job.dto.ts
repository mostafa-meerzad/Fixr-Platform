import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelJobDto {
  @ApiProperty({ example: 'Found another expert directly' })
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason: string;
}
