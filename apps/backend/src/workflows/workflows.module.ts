import { Module } from '@nestjs/common';
import { WorkflowsService } from './workflows.service.js';
import { WorkflowsController } from './workflows.controller.js';
import { NotificationsModule } from '../notifications/notification.module.js';

@Module({
  imports: [NotificationsModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
})
export class WorkflowsModule {}