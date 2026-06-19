import { IsInt, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCreditRateDto {
  @ApiProperty({ example: 50, description: 'AFN price per credit' })
  @IsInt()
  @Min(1)
  afnPerCredit: number;

  @ApiPropertyOptional({ example: 5, description: 'Welcome credits for newly verified experts' })
  @IsOptional()
  @IsInt()
  @Min(0)
  welcomeCredits?: number;

  @ApiPropertyOptional({ example: 30, description: 'Days before welcome credits expire' })
  @IsOptional()
  @IsInt()
  @Min(1)
  welcomeExpiryDays?: number;
}
