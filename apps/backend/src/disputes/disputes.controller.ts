import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Disputes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ version: '1' })
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post('jobs/:jobId/dispute')
  @ApiOperation({ summary: 'Raise a dispute on an active job (homeowner or assigned expert)' })
  create(
    @Param('jobId') jobId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateDisputeDto,
  ) {
    return this.disputesService.create(jobId, user, dto);
  }

  @Get('disputes')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all disputes (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.disputesService.findAll(Number(page), Number(limit));
  }

  @Get('disputes/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get full dispute detail including job, bids, media (admin)' })
  findOne(@Param('id') id: string) {
    return this.disputesService.findOne(id);
  }

  @Post('disputes/:id/resolve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Resolve a dispute with admin notes (admin)' })
  resolve(@Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    return this.disputesService.resolve(id, dto);
  }

  @Get('users/me/disputes')
  @ApiOperation({ summary: 'Get disputes the current user is involved in' })
  myDisputes(@CurrentUser() user: User) {
    return this.disputesService.findForUser(user.id);
  }
}
