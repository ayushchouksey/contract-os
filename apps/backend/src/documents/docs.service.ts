import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { DocumentKind } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { extname } from 'path';
import { StorageService } from '../common/storage/storage.service.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Injectable()
export class DocsService {
  private readonly logger = new Logger(DocsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(
    contractId: string,
    file: Express.Multer.File,
    user: AuthUser,
    kind: DocumentKind = DocumentKind.ORIGINAL,
  ) {
    if (!file || !file.buffer) throw new BadRequestException('No file provided');
    if (file.buffer.length === 0) {
      throw new BadRequestException('Empty file');
    }

    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });
    if (!contract) throw new NotFoundException('Contract not found');

    const buffer = file.buffer;
    const checksum = createHash('sha256').update(buffer).digest('hex');
    const key = this.storage.keyFor(
      contractId,
      `${Date.now()}-${randomUUID()}${extname(file.originalname)}`,
    );

    try {
      await this.storage.save(key, buffer, file.mimetype);
    } catch (err) {
      this.logger.error('Failed to store uploaded file', err);
      throw new InternalServerErrorException('Failed to store file');
    }

    try {
      return await this.prisma.document.create({
        data: {
          contractId,
          name: file.originalname,
          path: key,
          mimeType: file.mimetype,
          size: file.size,
          checksum,
          kind,
          uploadedById: user.id,
        },
        include: {
          uploadedBy: { select: { id: true, name: true } },
        },
      });
    } catch (err) {
      await this.storage.remove(key).catch(() => undefined);
      this.logger.error('Failed to index uploaded file', err);
      throw new InternalServerErrorException('Failed to index file');
    }
  }

  async list(contractId: string) {
    return this.prisma.document.findMany({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    });
  }

  findOne(docId: string) {
    return this.prisma.document.findUnique({ where: { id: docId } });
  }

  async remove(docId: string) {
    const doc = await this.prisma.document.findUnique({ where: { id: docId } });
    if (!doc) throw new NotFoundException('Document not found');
    await this.storage.remove(doc.path).catch(() => undefined);
    await this.prisma.document.delete({ where: { id: docId } });
    return { success: true };
  }
}