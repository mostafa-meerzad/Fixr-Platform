import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreditTransactionType } from '@prisma/client';
import { RecordPurchaseDto } from './dto/record-purchase.dto';
import { UpdateCreditRateDto } from './dto/update-rate.dto';
import { AdjustCreditsDto } from './dto/adjust-credits.dto';

@Injectable()
export class CreditsAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async recordPurchase(dto: RecordPurchaseDto, adminUserId: string) {
    const profileId = await this.getExpertProfileId(dto.expertUserId);
    const balance = await this.prisma.creditBalance.findUnique({ where: { expertId: profileId } });
    const currentBalance = balance?.balance ?? 0;
    const newBalance = currentBalance + dto.amount;

    return this.prisma.$transaction([
      this.prisma.creditBalance.upsert({
        where: { expertId: profileId },
        create: { expertId: profileId, balance: newBalance },
        update: { balance: newBalance },
      }),
      this.prisma.creditTransaction.create({
        data: {
          expertId: profileId,
          type: CreditTransactionType.PURCHASE,
          amount: dto.amount,
          balanceAfter: newBalance,
          description: dto.note ?? `${dto.amount} credits purchased — recorded by admin`,
        },
      }),
    ]);
  }

  async adjust(dto: AdjustCreditsDto, adminUserId: string) {
    const profileId = await this.getExpertProfileId(dto.expertUserId);
    const balance = await this.prisma.creditBalance.findUnique({ where: { expertId: profileId } });
    const currentBalance = balance?.balance ?? 0;
    const newBalance = currentBalance + dto.amount;

    if (newBalance < 0) {
      throw new BadRequestException(
        `Adjustment would result in a negative balance (current: ${currentBalance}, adjustment: ${dto.amount}).`,
      );
    }

    return this.prisma.$transaction([
      this.prisma.creditBalance.upsert({
        where: { expertId: profileId },
        create: { expertId: profileId, balance: newBalance },
        update: { balance: newBalance },
      }),
      this.prisma.creditTransaction.create({
        data: {
          expertId: profileId,
          type: CreditTransactionType.ADMIN_ADJUSTMENT,
          amount: dto.amount,
          balanceAfter: newBalance,
          description: dto.reason ?? `Admin adjustment of ${dto.amount} credits`,
        },
      }),
    ]);
  }

  async getLedger(expertProfileId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.creditTransaction.findMany({
        where: { expertId: expertProfileId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.creditTransaction.count({ where: { expertId: expertProfileId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getLedgerForUser(expertUserId: string, page: number, limit: number) {
    const profileId = await this.getExpertProfileId(expertUserId);
    return this.getLedger(profileId, page, limit);
  }

  async getRate() {
    const rate = await this.prisma.creditRate.findFirst({ orderBy: { updatedAt: 'desc' } });
    return rate ?? { afnPerCredit: 50, welcomeCredits: 5, welcomeExpiryDays: 30 };
  }

  async updateRate(dto: UpdateCreditRateDto, adminUserId: string) {
    const existing = await this.prisma.creditRate.findFirst({ orderBy: { updatedAt: 'desc' } });
    if (existing) {
      return this.prisma.creditRate.update({
        where: { id: existing.id },
        data: { ...dto, updatedBy: adminUserId },
      });
    }
    return this.prisma.creditRate.create({
      data: { ...dto, updatedBy: adminUserId },
    });
  }

  async getExpertProfileId(userId: string): Promise<string> {
    const profile = await this.prisma.expertProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) throw new NotFoundException(`Expert profile not found for user ${userId}.`);
    return profile.id;
  }
}
