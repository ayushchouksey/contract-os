import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service.js';
import { ContractsController } from './contracts.controller.js';
import { NotificationsModule } from '../notifications/notification.module.js';

@Module({
  imports: [NotificationsModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}