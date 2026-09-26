import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'fs';
import { createReadStream } from 'fs';
import { rm as removeFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { Readable } from 'stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

export type StorageDriver = 'local' | 'r2';

export interface StorageEntry {
  reference: string;
  stream?: Readable;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: StorageDriver;
  private readonly s3?: S3Client;
  private readonly bucket?: string;

  constructor(config: ConfigService) {
    this.driver = (config.get<string>('STORAGE_DRIVER', 'local') === 'r2'
      ? 'r2'
      : 'local') as StorageDriver;

    if (this.driver === 'r2') {
      const accountId = config.get<string>('R2_ACCOUNT_ID');
      const accessKeyId = config.get<string>('R2_ACCESS_KEY_ID');
      const secretAccessKey = config.get<string>('R2_SECRET_ACCESS_KEY');
      this.bucket = config.get<string>('R2_BUCKET');

      if (!accountId || !accessKeyId || !secretAccessKey || !this.bucket) {
        throw new Error(
          'STORAGE_DRIVER=r2 but R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET are not set',
        );
      }

      this.s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
  }

  getDriver(): StorageDriver {
    return this.driver;
  }

  /**
   * Reference for R2 is the object key; for local it is the relative path
   * under the uploads dir (resolved against process.cwd()).
   */
  keyFor(contractId: string, filename: string): string {
    if (this.driver === 'r2') return `documents/${contractId}/${filename}`;
    return join('uploads', filename);
  }

  async save(
    reference: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    if (this.driver === 'r2') {
      await this.s3!.send(
        new PutObjectCommand({
          Bucket: this.bucket!,
          Key: reference,
          Body: buffer,
          ContentType: mimeType,
        }),
      );
      return reference;
    }

    const full = join(process.cwd(), reference);
    mkdirSync(dirname(full), { recursive: true });
    await writeFile(full, buffer);
    return reference;
  }

  async open(reference: string): Promise<StorageEntry> {
    if (this.driver === 'r2') {
      try {
        const res = await this.s3!.send(
          new GetObjectCommand({ Bucket: this.bucket!, Key: reference }),
        );
        return { reference, stream: res.Body as Readable };
      } catch (err: any) {
        this.logger.error(`R2 get "${reference}" failed`, err);
        throw new NotFoundException('Stored object not found');
      }
    }

    const full = join(process.cwd(), reference);
    return { reference, stream: createReadStream(full) };
  }

  async remove(reference: string): Promise<void> {
    if (this.driver === 'r2') {
      await this.s3!.send(
        new DeleteObjectCommand({ Bucket: this.bucket!, Key: reference }),
      );
      return;
    }
    await removeFile(join(process.cwd(), reference), { force: true });
  }
}