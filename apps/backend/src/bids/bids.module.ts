import { Module } from '@nestjs/common';
import { BidsController } from './bids.controller';
import { BidsService } from './bids.service';
import { JobsModule } from '../jobs/jobs.module';
import { CreditsModule } from '../credits/credits.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [JobsModule, CreditsModule, NotificationsModule],
  controllers: [BidsController],
  providers: [BidsService],
  exports: [BidsService],
})
export class BidsModule {}
