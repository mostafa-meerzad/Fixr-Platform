import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from './otp.service';
import { TokenService, TokenPair } from './token.service';
import { RegisterDto } from './dto/register.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
  ) {}

  async sendOtp(phone: string) {
    return this.otpService.sendOtp(phone);
  }

  async verifyOtp(phone: string, code: string) {
    return this.otpService.verifyOtp(phone, code);
  }

  async login(
    phone: string,
    sessionId: string,
  ): Promise<TokenPair & { user: object }> {
    await this.otpService.consumeSession(sessionId, phone);

    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new UnauthorizedException('No account found. Please register first.');
    }

    if (user.isSuspended) {
      throw new ForbiddenException('Your account has been suspended.');
    }

    const tokens = await this.tokenService.issueTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async register(
    dto: RegisterDto,
  ): Promise<TokenPair & { user: object }> {
    await this.otpService.consumeSession(dto.sessionId, dto.phone);

    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException('An account with this phone number already exists.');
    }

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        name: dto.name,
        role: dto.role,
        ...(dto.role === UserRole.EXPERT && {
          expertProfile: { create: {} },
        }),
      },
      include: { expertProfile: true },
    });

    const tokens = await this.tokenService.issueTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    return this.tokenService.refresh(refreshToken);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId, token: refreshToken },
      });
    } else {
      await this.tokenService.revokeAllForUser(userId);
    }
  }

  async adminLogin(
    dto: AdminLoginDto,
  ): Promise<{ accessToken: string; user: object }> {
    const adminProfile = await this.prisma.adminProfile.findUnique({
      where: { email: dto.email },
      include: { user: true },
    });

    if (!adminProfile) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const valid = await bcrypt.compare(dto.password, adminProfile.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const accessToken = this.tokenService.issueAdminAccessToken(
      adminProfile.id,
      adminProfile.userId,
    );

    return {
      accessToken,
      user: {
        id: adminProfile.userId,
        name: adminProfile.user.name,
        email: adminProfile.email,
        role: 'ADMIN',
      },
    };
  }
}
