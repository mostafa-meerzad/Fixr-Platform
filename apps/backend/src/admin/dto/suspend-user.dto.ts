import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuspendUserDto {
  @ApiProperty()
  @IsBoolean()
  isSuspended: boolean;

  @ApiPropertyOptional({ example: 'Repeated no-shows and complaints.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
