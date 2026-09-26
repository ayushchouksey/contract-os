import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './common/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { ContractsModule } from './contracts/contracts.module.js';
import { TemplatesModule } from './templates/templates.module.js';
import { WorkflowsModule } from './workflows/workflows.module.js';
import { DocumentsModule } from './documents/docs.module.js';
import { AiModule } from './ai/ai.module.js';
import { NotificationsModule } from './notifications/notification.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ContractsModule,
    TemplatesModule,
    WorkflowsModule,
    DocumentsModule,
    AiModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}