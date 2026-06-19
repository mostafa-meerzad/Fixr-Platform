import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { NoShowService } from './jobs.no-show';
import { NotificationsModule } from '../notifications/notifications.module';
import { CreditsModule } from '../credits/credits.module';

@Module({
  imports: [NotificationsModule, CreditsModule],
  controllers: [JobsController],
  providers: [JobsService, NoShowService],
  exports: [JobsService, NoShowService],
})
export class JobsModule {}
