import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { FirebaseProvider } from './firebase.provider';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, FirebaseProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
