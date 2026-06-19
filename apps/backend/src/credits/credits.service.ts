import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreditTransactionType } from '@prisma/client';

@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(expertId: string): Promise<number> {
    const balance = await this.prisma.creditBalance.findUnique({
      where: { expertId },
    });
    return balance?.balance ?? 0;
  }

  async spendCredit(expertId: string, jobId: string): Promise<void> {
    const balance = await this.prisma.creditBalance.findUnique({
      where: { expertId },
    });

    if (!balance || balance.balance < 1) {
      throw new BadRequestException(
        'Insufficient credits. Please purchase more credits to place a bid.',
      );
    }

    const newBalance = balance.balance - 1;

    await this.prisma.$transaction([
      this.prisma.creditBalance.update({
        where: { expertId },
        data: { balance: newBalance },
      }),
      this.prisma.creditTransaction.create({
        data: {
          expertId,
          type: CreditTransactionType.BID_SPEND,
          amount: -1,
          balanceAfter: newBalance,
          description: `Bid placed on job ${jobId}`,
        },
      }),
    ]);
  }

  async refundBid(expertId: string, jobId: string): Promise<void> {
    const balance = await this.prisma.creditBalance.findUnique({
      where: { expertId },
    });

    const currentBalance = balance?.balance ?? 0;
    const newBalance = currentBalance + 1;

    await this.prisma.$transaction([
      this.prisma.creditBalance.upsert({
        where: { expertId },
        create: { expertId, balance: newBalance },
        update: { balance: newBalance },
      }),
      this.prisma.creditTransaction.create({
        data: {
          expertId,
          type: CreditTransactionType.BID_REFUND,
          amount: 1,
          balanceAfter: newBalance,
          description: `Refund — homeowner cancelled job ${jobId}`,
        },
      }),
    ]);
  }

  async grantWelcomeCredits(expertId: string): Promise<void> {
    const rate = await this.prisma.creditRate.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    const amount = rate?.welcomeCredits ?? 5;
    const expiryDays = rate?.welcomeExpiryDays ?? 30;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.creditBalance.upsert({
        where: { expertId },
        create: { expertId, balance: amount },
        update: { balance: { increment: amount } },
      }),
      this.prisma.creditTransaction.create({
        data: {
          expertId,
          type: CreditTransactionType.WELCOME_GRANT,
          amount,
          balanceAfter: amount,
          description: `Welcome credits granted on verification`,
          expiresAt,
        },
      }),
    ]);
  }
}
