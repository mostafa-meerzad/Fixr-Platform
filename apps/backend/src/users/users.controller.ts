import {
  Controller, Get, Patch, Post, Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  UpdateExpertProfileDto,
  UpdateExpertAvailabilityDto,
  UpdateExpertZonesDto,
  SubmitVerificationDto,
} from './dto/update-expert-profile.dto';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser() user: User) {
    return this.usersService.getMe(user);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update name or language preference' })
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user, dto);
  }

  @Patch('me/fcm-token')
  @ApiOperation({ summary: 'Register or refresh FCM device token' })
  updateFcmToken(@CurrentUser() user: User, @Body() dto: UpdateFcmTokenDto) {
    return this.usersService.updateFcmToken(user, dto);
  }

  // ─── Expert-only ──────────────────────────────────────────────────────────

  @Patch('me/expert-profile')
  @Roles(UserRole.EXPERT)
  @ApiOperation({ summary: 'Update expert description / shop name' })
  updateExpertProfile(@CurrentUser() user: User, @Body() dto: UpdateExpertProfileDto) {
    return this.usersService.updateExpertProfile(user, dto);
  }

  @Patch('me/availability')
  @Roles(UserRole.EXPERT)
  @ApiOperation({ summary: 'Toggle availability to receive job alerts' })
  setAvailability(@CurrentUser() user: User, @Body() dto: UpdateExpertAvailabilityDto) {
    return this.usersService.setAvailability(user, dto);
  }

  @Patch('me/zones')
  @Roles(UserRole.EXPERT)
  @ApiOperation({ summary: 'Replace service zone assignments (1–10 zones)' })
  updateServiceZones(@CurrentUser() user: User, @Body() dto: UpdateExpertZonesDto) {
    return this.usersService.updateServiceZones(user, dto);
  }

  @Post('me/submit-verification')
  @Roles(UserRole.EXPERT)
  @ApiOperation({ summary: 'Submit expert profile for admin review' })
  submitVerification(@CurrentUser() user: User, @Body() dto: SubmitVerificationDto) {
    return this.usersService.submitVerification(user, dto);
  }

  // ─── Public expert profile ────────────────────────────────────────────────

  @Get('experts/:userId')
  @ApiOperation({ summary: 'Get public expert profile (visible after bid placement)' })
  getPublicExpert(@Param('userId') userId: string) {
    return this.usersService.getPublicExpertProfile(userId);
  }
}
