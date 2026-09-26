import {
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { pipeline } from 'stream/promises';
import { DocsService } from './docs.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { StorageService } from '../common/storage/storage.service.js';
import type { Response } from 'express';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Controller()
export class DocsController {
  private readonly logger = new Logger(DocsController.name);

  constructor(
    private readonly docsService: DocsService,
    private readonly storage: StorageService,
  ) {}

  @Post('contracts/:id/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  upload(
    @Param('id') contractId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    return this.docsService.upload(contractId, file, user);
  }

  @Get('contracts/:id/documents')
  list(@Param('id') contractId: string) {
    return this.docsService.list(contractId);
  }

  @Get('documents/:docId/download')
  async download(@Param('docId') docId: string, @Res() res: Response) {
    const doc = await this.docsService.findOne(docId);
    if (!doc) throw new NotFoundException('Document not found');

    const entry = await this.storage.open(doc.path);
    const filename = doc.name.replace(/["\\\r\n]/g, '_');
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Length', doc.size);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    await pipeline(entry.stream!, res).catch((err) => {
      this.logger.error(`Download stream failed for ${docId}`, err);
      if (!res.headersSent) res.status(500).end();
    });
  }
}