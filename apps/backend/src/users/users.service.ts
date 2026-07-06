import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  UpdateExpertProfileDto,
  UpdateExpertAvailabilityDto,
  UpdateExpertZonesDto,
  UpdateExpertCategoriesDto,
  SubmitVerificationDto,
} from './dto/update-expert-profile.dto';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';
import { User, VerificationStatus } from '@prisma/client';

const EXPERT_INCLUDE = {
  serviceZones: { include: { zone: true } },
  serviceCategories: { include: { category: true } },
  creditBalance: true,
  shopZone: { select: { id: true, nameEn: true } },
} as const;

const HOMEOWNER_PROFILE_INCLUDE = {
  zone: { select: { id: true, nameEn: true } },
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(user: User) {
    if (user.role === 'EXPERT') {
      const profile = await this.prisma.expertProfile.findUnique({
        where: { userId: user.id },
        include: EXPERT_INCLUDE,
      });
      return { ...user, expertProfile: profile };
    }
    if (user.role === 'HOMEOWNER') {
      const homeownerProfile = await this.prisma.homeownerProfile.findUnique({
        where: { userId: user.id },
        include: HOMEOWNER_PROFILE_INCLUDE,
      });
      return { ...user, homeownerProfile };
    }
    return user;
  }

  async updateProfile(user: User, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: user.id },
      data: dto,
    });
  }

  async updateFcmToken(user: User, dto: UpdateFcmTokenDto) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { fcmToken: dto.fcmToken },
    });
    return { success: true };
  }

  // ─── Expert profile ────────────────────────────────────────────────────────

  async getExpertProfile(userId: string) {
    const profile = await this.prisma.expertProfile.findUnique({
      where: { userId },
      include: EXPERT_INCLUDE,
    });
    if (!profile) throw new NotFoundException('Expert profile not found.');
    return profile;
  }

  async updateExpertProfile(user: User, dto: UpdateExpertProfileDto) {
    const profile = await this.findExpertProfileOrFail(user.id);
    return this.prisma.expertProfile.update({
      where: { id: profile.id },
      data: dto,
      include: EXPERT_INCLUDE,
    });
  }

  async setAvailability(user: User, dto: UpdateExpertAvailabilityDto) {
    const profile = await this.findExpertProfileOrFail(user.id);

    if (
      profile.verificationStatus !== VerificationStatus.VERIFIED &&
      dto.isAvailable
    ) {
      throw new ForbiddenException(
        'Your account must be verified before you can receive job alerts.',
      );
    }

    return this.prisma.expertProfile.update({
      where: { id: profile.id },
      data: { isAvailable: dto.isAvailable },
    });
  }

  async updateServiceZones(user: User, dto: UpdateExpertZonesDto) {
    const profile = await this.findExpertProfileOrFail(user.id);

    if (dto.zoneIds.length === 0) {
      throw new BadRequestException('You must select at least one service zone.');
    }
    if (dto.zoneIds.length > 10) {
      throw new BadRequestException('You can serve a maximum of 10 zones.');
    }

    const zones = await this.prisma.zone.findMany({
      where: { id: { in: dto.zoneIds }, isActive: true },
    });
    if (zones.length !== dto.zoneIds.length) {
      throw new BadRequestException('One or more zone IDs are invalid or inactive.');
    }

    await this.prisma.$transaction([
      this.prisma.expertZone.deleteMany({ where: { expertId: profile.id } }),
      this.prisma.expertZone.createMany({
        data: dto.zoneIds.map((zoneId) => ({ expertId: profile.id, zoneId })),
      }),
    ]);

    return this.prisma.expertProfile.findUnique({
      where: { id: profile.id },
      include: EXPERT_INCLUDE,
    });
  }

  async updateServiceCategories(user: User, dto: UpdateExpertCategoriesDto) {
    const profile = await this.findExpertProfileOrFail(user.id);

    if (dto.categoryIds.length === 0) {
      throw new BadRequestException('You must select at least one service category.');
    }

    const categories = await this.prisma.category.findMany({
      where: { id: { in: dto.categoryIds }, isActive: true },
    });
    if (categories.length !== dto.categoryIds.length) {
      throw new BadRequestException('One or more category IDs are invalid or inactive.');
    }

    await this.prisma.$transaction([
      this.prisma.expertCategory.deleteMany({ where: { expertId: profile.id } }),
      this.prisma.expertCategory.createMany({
        data: dto.categoryIds.map((categoryId) => ({ expertId: profile.id, categoryId })),
      }),
    ]);

    return this.prisma.expertProfile.findUnique({
      where: { id: profile.id },
      include: EXPERT_INCLUDE,
    });
  }

  async submitVerification(user: User, dto: SubmitVerificationDto) {
    const profile = await this.findExpertProfileOrFail(user.id);

    if (profile.verificationStatus === VerificationStatus.VERIFIED) {
      throw new BadRequestException('Your account is already verified.');
    }

    if (
      !profile.selfieUrl ||
      !profile.tazkiraFrontUrl ||
      !profile.tazkiraBackUrl ||
      !profile.shopImageUrl ||
      !profile.workLicenseUrl
    ) {
      throw new BadRequestException(
        'Please upload your selfie, Tazkira (front and back), shop image, and work license before submitting.',
      );
    }

    const shopZone = await this.prisma.zone.findUnique({ where: { id: dto.shopZoneId } });
    if (!shopZone || !shopZone.isActive) {
      throw new BadRequestException('Invalid or inactive shop zone.');
    }

    return this.prisma.expertProfile.update({
      where: { id: profile.id },
      data: {
        shopName: dto.shopName,
        description: dto.description,
        shopZoneId: dto.shopZoneId,
        shopAddress: dto.shopAddress,
        verificationStatus: VerificationStatus.PENDING,
      },
      include: EXPERT_INCLUDE,
    });
  }

  // ─── Public expert profile (visible to homeowners browsing bids) ───────────

  async getPublicExpertProfile(expertUserId: string) {
    const profile = await this.prisma.expertProfile.findUnique({
      where: { userId: expertUserId },
      select: {
        id: true,
        shopName: true,
        shopZoneId: true,
        shopAddress: true,
        description: true,
        rating: true,
        completedJobs: true,
        noShowCount: true,
        positivePoints: true,
        negativePoints: true,
        verificationStatus: true,
        shopZone: { select: { id: true, nameEn: true } },
        serviceZones: { include: { zone: { select: { id: true, name: true, nameEn: true } } } },
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    if (!profile || profile.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new NotFoundException('Expert profile not found.');
    }

    return profile;
  }

  private async findExpertProfileOrFail(userId: string) {
    const profile = await this.prisma.expertProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Expert profile not found.');
    return profile;
  }
}
