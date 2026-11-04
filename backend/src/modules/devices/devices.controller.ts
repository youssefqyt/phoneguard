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
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { PairDeviceDto, UpdateDeviceDto } from './dto/pair-device.dto';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('devices')
@ApiBearerAuth('access-token')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post()
  @ApiOperation({
    summary: 'Register a device and receive a pairing code',
  })
  register(@CurrentUser() user: AuthUser, @Body() dto: RegisterDeviceDto) {
    return this.devices.register(user.id, dto);
  }

  @Post('pair')
  @ApiOperation({
    summary: 'Pair a managed device into a household using its code',
  })
  pair(@CurrentUser() user: AuthUser, @Body() dto: PairDeviceDto) {
    return this.devices.pair(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List devices you own or manage',
    description: 'Revoked devices are hidden unless `includeRevoked=true`.',
  })
  list(@CurrentUser() user: AuthUser, @Query('includeRevoked') includeRevoked?: string) {
    return this.devices.list(user.id, includeRevoked === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a device with its active rules' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.devices.getById(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a device (name, push token, versions)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDeviceDto,
  ) {
    return this.devices.update(user.id, id, dto);
  }

  @Post(':id/heartbeat')
  @ApiOperation({ summary: 'Record device liveness' })
  heartbeat(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.devices.heartbeat(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke a device' })
  revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.devices.revoke(user.id, id);
  }
}
