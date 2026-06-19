import { PartialType } from '@nestjs/swagger';
import { PlaceBidDto } from './place-bid.dto';

export class UpdateBidDto extends PartialType(PlaceBidDto) {}
