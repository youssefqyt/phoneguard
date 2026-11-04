import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationDto,
  NotificationsQueryDto,
  RegisterPushTokenDto,
} from './dto/notification.dto';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List your notifications' })
  list(@CurrentUser() user: AuthUser, @Query() query: NotificationsQueryDto) {
    return this.notifications.list(user.id, query.unread === 'true');
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Count your unread notifications' })
  unread(@CurrentUser() user: AuthUser) {
    return this.notifications.unreadCount(user.id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark every notification as read' })
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.id);
  }

  @Post('push-token')
  @ApiOperation({ summary: 'Register a device push token' })
  registerToken(
    @CurrentUser() user: AuthUser,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.notifications.registerPushToken(user.id, dto);
  }

  @Post('test')
  @ApiOperation({ summary: 'Create a test notification for the current user' })
  test(@CurrentUser() user: AuthUser, @Body() dto: CreateNotificationDto) {
    return this.notifications.create(user.id, {
      type: dto.type,
      title: dto.title,
      body: dto.body,
      data: dto.data,
    });
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(user.id, id);
  }
}
