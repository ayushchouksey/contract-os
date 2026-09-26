import { Module } from '@nestjs/common';
import { DocsService } from './docs.service.js';
import { DocsController } from './docs.controller.js';
import { StorageModule } from '../common/storage/storage.module.js';

@Module({
  imports: [StorageModule],
  controllers: [DocsController],
  providers: [DocsService],
  exports: [DocsService],
})
export class DocumentsModule {}