import { Controller, Get, Post, Put, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CreditsService } from './credits.service';
import { CreditsAdminService } from './credits-admin.service';
import { RecordPurchaseDto } from './dto/record-purchase.dto';
import { UpdateCreditRateDto } from './dto/update-rate.dto';
import { AdjustCreditsDto } from './dto/adjust-credits.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Credits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'credits', version: '1' })
export class CreditsController {
  constructor(
    private readonly creditsService: CreditsService,
    private readonly creditsAdminService: CreditsAdminService,
  ) {}

  // ─── Expert: view own balance and ledger ──────────────────────────────────

  @Get('me/balance')
  @Roles(UserRole.EXPERT)
  @ApiOperation({ summary: 'Get current credit balance (expert)' })
  async getMyBalance(@CurrentUser() user: User) {
    const profile = await this.creditsAdminService.getExpertProfileId(user.id);
    const balance = await this.creditsService.getBalance(profile);
    return { balance };
  }

  @Get('me/ledger')
  @Roles(UserRole.EXPERT)
  @ApiOperation({ summary: 'Get credit transaction history (expert)' })
  async getMyLedger(
    @CurrentUser() user: User,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const profile = await this.creditsAdminService.getExpertProfileId(user.id);
    return this.creditsAdminService.getLedger(profile, Number(page), Number(limit));
  }

  // ─── Admin: manage credits ────────────────────────────────────────────────

  @Post('admin/purchase')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Record a manual credit purchase for an expert (admin)' })
  recordPurchase(@Body() dto: RecordPurchaseDto, @CurrentUser() admin: User) {
    return this.creditsAdminService.recordPurchase(dto, admin.id);
  }

  @Post('admin/adjust')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually adjust an expert\'s credit balance (admin)' })
  adjust(@Body() dto: AdjustCreditsDto, @CurrentUser() admin: User) {
    return this.creditsAdminService.adjust(dto, admin.id);
  }

  @Get('admin/ledger/:expertUserId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'View credit ledger for a specific expert (admin)' })
  getLedger(
    @Param('expertUserId') expertUserId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.creditsAdminService.getLedgerForUser(expertUserId, Number(page), Number(limit));
  }

  @Get('admin/rate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get current credit rate settings (admin)' })
  getRate() {
    return this.creditsAdminService.getRate();
  }

  @Put('admin/rate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update AFN/credit rate and welcome credit settings (admin)' })
  updateRate(@Body() dto: UpdateCreditRateDto, @CurrentUser() admin: User) {
    return this.creditsAdminService.updateRate(dto, admin.id);
  }
}
