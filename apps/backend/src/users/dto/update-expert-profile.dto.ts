import { IsString, IsOptional, IsBoolean, MaxLength, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateExpertProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shopName?: string;
}

export class UpdateExpertAvailabilityDto {
  @ApiPropertyOptional()
  @IsBoolean()
  isAvailable: boolean;
}

export class UpdateExpertZonesDto {
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  zoneIds: string[];
}

export class UpdateExpertCategoriesDto {
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  categoryIds: string[];
}

export class SubmitVerificationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shopName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 'clx_zone1', description: 'Zone where the shop is located' })
  @IsString()
  shopZoneId: string;

  @ApiProperty({ example: '12th Street, Shop No. 4', description: 'Physical shop address' })
  @IsString()
  @MaxLength(500)
  shopAddress: string;
}
