import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FocusService } from './focus.service';
import { StartFocusDto } from './dto/start-focus.dto';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('focus')
@ApiBearerAuth('access-token')
@Controller('focus')
export class FocusController {
  constructor(private readonly focus: FocusService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a focus session' })
  start(@CurrentUser() user: AuthUser, @Body() dto: StartFocusDto) {
    return this.focus.start(user.id, dto);
  }

  @Post(':id/stop')
  @ApiOperation({ summary: 'Stop a focus session and award points if completed' })
  stop(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.focus.stop(user.id, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a focus session' })
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.focus.cancel(user.id, id);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get the current active session, if any' })
  active(@CurrentUser() user: AuthUser) {
    return this.focus.active(user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'List recent focus sessions' })
  history(@CurrentUser() user: AuthUser) {
    return this.focus.history(user.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Aggregate focus stats' })
  stats(@CurrentUser() user: AuthUser) {
    return this.focus.stats(user.id);
  }
}
