import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BidsService } from './bids.service';
import { PlaceBidDto } from './dto/place-bid.dto';
import { UpdateBidDto } from './dto/update-bid.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Bids')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ version: '1' })
export class BidsController {
  constructor(private readonly bidsService: BidsService) {}

  // ─── Expert: place bid on a job ───────────────────────────────────────────

  @Post('jobs/:jobId/bids')
  @Roles(UserRole.EXPERT)
  @ApiOperation({ summary: 'Place a bid on an open job (costs 1 credit)' })
  @ApiParam({ name: 'jobId' })
  place(
    @Param('jobId') jobId: string,
    @CurrentUser() user: User,
    @Body() dto: PlaceBidDto,
  ) {
    return this.bidsService.place(jobId, user, dto);
  }

  // ─── Expert: update their bid ─────────────────────────────────────────────

  @Patch('bids/:bidId')
  @Roles(UserRole.EXPERT)
  @ApiOperation({ summary: 'Update a pending bid (before acceptance)' })
  @ApiParam({ name: 'bidId' })
  update(
    @Param('bidId') bidId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateBidDto,
  ) {
    return this.bidsService.update(bidId, user, dto);
  }

  // ─── Expert: withdraw their bid ───────────────────────────────────────────

  @Delete('bids/:bidId')
  @Roles(UserRole.EXPERT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw a pending bid (before acceptance)' })
  @ApiParam({ name: 'bidId' })
  withdraw(@Param('bidId') bidId: string, @CurrentUser() user: User) {
    return this.bidsService.withdraw(bidId, user);
  }

  // ─── Homeowner: accept a bid ──────────────────────────────────────────────

  @Post('jobs/:jobId/bids/:bidId/accept')
  @Roles(UserRole.HOMEOWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept a bid — assigns the expert and unlocks chat',
  })
  @ApiParam({ name: 'jobId' })
  @ApiParam({ name: 'bidId' })
  accept(
    @Param('jobId') jobId: string,
    @Param('bidId') bidId: string,
    @CurrentUser() user: User,
  ) {
    return this.bidsService.accept(jobId, bidId, user);
  }

  // ─── Homeowner / Admin: list bids for a job ───────────────────────────────

  @Get('jobs/:jobId/bids')
  @ApiOperation({
    summary:
      'List bids for a job. Homeowner sees all; Expert sees only their own; Admin sees all.',
  })
  @ApiParam({ name: 'jobId' })
  listForJob(@Param('jobId') jobId: string, @CurrentUser() user: User) {
    return this.bidsService.listForJob(jobId, user);
  }

  // ─── Expert: list their own bids across all jobs ──────────────────────────

  @Get('bids/mine')
  @Roles(UserRole.EXPERT)
  @ApiOperation({ summary: "List the expert's own bids across all jobs" })
  listMine(@CurrentUser() user: User) {
    return this.bidsService.listForExpert(user);
  }
}
