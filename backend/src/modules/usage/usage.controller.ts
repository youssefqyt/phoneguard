import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsageService } from './usage.service';
import {
  IngestUsageDto,
  TopAppsQueryDto,
  UsageDayQueryDto,
  UsageRangeQueryDto,
} from './dto/usage.dto';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('usage')
@ApiBearerAuth('access-token')
@Controller('usage')
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  @Post('ingest')
  @ApiOperation({
    summary: 'Ingest a day of per-app usage from a device',
    description:
      'Idempotent — re-sending the same day overwrites the previous values. ' +
      'Also refreshes limit counters so clients can read remaining allowance.',
  })
  ingest(@CurrentUser() user: AuthUser, @Body() dto: IngestUsageDto) {
    return this.usage.ingest(user.id, dto);
  }

  @Get('overview')
  @ApiOperation({ summary: 'Headline screen-time stats plus top apps and a 7-day series' })
  overview(@CurrentUser() user: AuthUser, @Query() query: UsageDayQueryDto) {
    return this.usage.overview(user.id, query);
  }

  @Get('apps')
  @ApiOperation({ summary: 'Per-app usage for a single day' })
  apps(@CurrentUser() user: AuthUser, @Query() query: UsageDayQueryDto) {
    return this.usage.appsForDay(user.id, query);
  }

  @Get('top-apps')
  @ApiOperation({ summary: 'Top apps by usage for a day' })
  topApps(@CurrentUser() user: AuthUser, @Query() query: TopAppsQueryDto) {
    return this.usage.overview(user.id, query);
  }

  @Get('range')
  @ApiOperation({ summary: 'Daily screen-time series across a date range' })
  range(@CurrentUser() user: AuthUser, @Query() query: UsageRangeQueryDto) {
    return this.usage.range(user.id, query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Usage grouped by app category across a date range' })
  categories(@CurrentUser() user: AuthUser, @Query() query: UsageRangeQueryDto) {
    return this.usage.categoryBreakdown(user.id, query);
  }
}
