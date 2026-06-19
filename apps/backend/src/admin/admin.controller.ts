import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { VerifyExpertDto } from './dto/verify-expert.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Platform dashboard metrics' })
  getDashboard() {
    return this.adminService.getDashboardMetrics();
  }

  // ─── Verification ─────────────────────────────────────────────────────────

  @Get('verification/pending')
  @ApiOperation({ summary: 'List experts pending verification' })
  getPending() {
    return this.adminService.getPendingVerifications();
  }

  @Post('verification/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject an expert\'s verification' })
  verify(@Param('userId') userId: string, @Body() dto: VerifyExpertDto) {
    return this.adminService.verifyExpert(userId, dto);
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all users (paginated, filterable by role)' })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getUsers(
    @Query('role') role?: UserRole,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getUsers(role, Number(page), Number(limit));
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get full user detail' })
  getUser(@Param('userId') userId: string) {
    return this.adminService.getUser(userId);
  }

  @Patch('users/:userId/suspension')
  @ApiOperation({ summary: 'Suspend or unsuspend a user' })
  setSuspension(@Param('userId') userId: string, @Body() dto: SuspendUserDto) {
    return this.adminService.setSuspension(userId, dto);
  }

  @Patch('users/:userId/expert-points')
  @ApiOperation({ summary: 'Adjust expert points/no-show count post-dispute' })
  adjustPoints(
    @Param('userId') userId: string,
    @Body() body: { positivePoints?: number; negativePoints?: number; noShowCount?: number },
  ) {
    return this.adminService.adjustExpertPoints(userId, body);
  }

  // ─── Notifications log ────────────────────────────────────────────────────

  @Get('notifications')
  @ApiOperation({ summary: 'View all platform notifications (admin)' })
  getNotifications(
    @Query('page') page = '1',
    @Query('limit') limit = '30',
  ) {
    return this.adminService.getNotifications(Number(page), Number(limit));
  }
}
