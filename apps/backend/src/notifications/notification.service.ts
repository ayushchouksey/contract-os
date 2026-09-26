import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

interface CreateNotificationDto {
  userId: string;
  title: string;
  body?: string;
  type?: string;
  entityType?: string;
  entityId?: string;
}

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        body: dto.body,
        type: dto.type ?? 'INFO',
        entityType: dto.entityType,
        entityId: dto.entityId,
      },
    });
  }

  async listForUser(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async stats(userId: string) {
    const [total, unread] = await Promise.all([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { total, unread };
  }
}