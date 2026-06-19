import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JobsModule } from './jobs/jobs.module';
import { BidsModule } from './bids/bids.module';
import { CategoriesModule } from './categories/categories.module';
import { ZonesModule } from './zones/zones.module';
import { CreditsModule } from './credits/credits.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DisputesModule } from './disputes/disputes.module';
import { ReviewsModule } from './reviews/reviews.module';
import { MediaModule } from './media/media.module';
import { AdminModule } from './admin/admin.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: 10,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    JobsModule,
    BidsModule,
    CategoriesModule,
    ZonesModule,
    CreditsModule,
    NotificationsModule,
    DisputesModule,
    ReviewsModule,
    MediaModule,
    AdminModule,
    ChatModule,
  ],
})
export class AppModule {}
