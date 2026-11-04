import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RulesService } from './rules.service';
import { CreateRuleDto, RuleQueryDto, UpdateRuleDto } from './dto/rule.dto';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';

class ToggleRuleDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}

@ApiTags('rules')
@ApiBearerAuth('access-token')
@Controller('rules')
export class RulesController {
  constructor(private readonly rules: RulesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a rule (app limit, blocklist or schedule)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRuleDto) {
    return this.rules.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List rules you can see' })
  list(@CurrentUser() user: AuthUser, @Query() query: RuleQueryDto) {
    return this.rules.list(user.id, query);
  }

  @Get('effective/:deviceId')
  @ApiOperation({
    summary: 'Get the effective policy bundle a device should enforce',
  })
  effective(
    @CurrentUser() user: AuthUser,
    @Param('deviceId') deviceId: string,
    @Query('date') date?: string,
  ) {
    return this.rules.effective(user.id, deviceId, date);
  }

  @Get('progress/:deviceId')
  @ApiOperation({ summary: 'Get per-app limit progress for a device today' })
  progress(
    @CurrentUser() user: AuthUser,
    @Param('deviceId') deviceId: string,
    @Query('date') date?: string,
  ) {
    return this.rules.progress(user.id, deviceId, date);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a rule' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.rules.getById(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a rule' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateRuleDto,
  ) {
    return this.rules.update(user.id, id, dto);
  }

  @Post(':id/toggle')
  @ApiOperation({ summary: 'Enable or disable a rule' })
  toggle(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ToggleRuleDto,
  ) {
    return this.rules.toggle(user.id, id, dto.enabled);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a rule' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.rules.remove(user.id, id);
  }
}
