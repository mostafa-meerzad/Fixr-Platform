import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OTP_PROVIDER_TOKEN } from './providers/otp-provider.interface';
import { TelegramGatewayOtpProvider } from './providers/telegram-otp.provider';
import { WhatsAppOtpProvider } from './providers/whatsapp-otp.provider';

const otpProviderFactory = {
  provide: OTP_PROVIDER_TOKEN,
  useFactory: (config: ConfigService) => {
    const name = config.get<string>('OTP_PROVIDER', 'telegram').toLowerCase();
    return name === 'whatsapp'
      ? new WhatsAppOtpProvider(config)
      : new TelegramGatewayOtpProvider(config);
  },
  inject: [ConfigService],
};

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    TokenService,
    JwtStrategy,
    otpProviderFactory,
  ],
  exports: [TokenService, JwtStrategy],
})
export class AuthModule {}
