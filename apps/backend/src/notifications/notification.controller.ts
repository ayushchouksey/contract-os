import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { NotificationService } from './notification.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notifications.listForUser(
      user.id,
      unreadOnly === 'true',
    );
  }

  @Get('stats')
  stats(@CurrentUser() user: AuthUser) {
    return this.notifications.stats(user.id);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notifications.markRead(id, user.id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.id);
  }
}