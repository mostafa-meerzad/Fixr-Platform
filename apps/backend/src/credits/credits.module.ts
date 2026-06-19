import { Module } from '@nestjs/common';
import { CreditsController } from './credits.controller';
import { CreditsService } from './credits.service';
import { CreditsAdminService } from './credits-admin.service';

@Module({
  controllers: [CreditsController],
  providers: [CreditsService, CreditsAdminService],
  exports: [CreditsService, CreditsAdminService],
})
export class CreditsModule {}
