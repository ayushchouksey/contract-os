import { PrismaClient, Prisma } from '@prisma/client';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async truncate() {
    const tables = Prisma.dmmf.datamodel.models.map((m) => m.dbName ?? m.name);
    for (const table of tables) {
      await this.$executeRawUnsafe(
        `TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`,
      );
    }
  }
}