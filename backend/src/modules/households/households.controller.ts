import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { HouseholdsService } from './households.service';
import {
  CreateHouseholdDto,
  UpdateHouseholdDto,
} from './dto/household.dto';
import {
  AcceptInviteDto,
  AddMemberDto,
  CreateInviteDto,
  UpdateMemberDto,
} from './dto/invite.dto';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('households')
@ApiBearerAuth('access-token')
@Controller('households')
export class HouseholdsController {
  constructor(private readonly households: HouseholdsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a household (you become the owner)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateHouseholdDto) {
    return this.households.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List household memberships for the current user' })
  list(@CurrentUser() user: AuthUser) {
    return this.households.listForUser(user.id);
  }

  @Post('invites/accept')
  @ApiOperation({ summary: 'Accept a household invite by code' })
  acceptInvite(@CurrentUser() user: AuthUser, @Body() dto: AcceptInviteDto) {
    return this.households.acceptInvite(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a household with members and devices' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.households.getById(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a household (guardian only)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateHouseholdDto,
  ) {
    return this.households.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a household (owner only)' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.households.remove(user.id, id);
  }

  // -------------------------------------------------------------------------
  // Members
  // -------------------------------------------------------------------------

  @Get(':id/members')
  @ApiOperation({ summary: 'List household members' })
  listMembers(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.households.listMembers(user.id, id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add an existing user to the household (guardian only)' })
  addMember(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.households.addMember(user.id, id, dto);
  }

  @Patch(':id/members/:memberId')
  @ApiOperation({ summary: 'Change a member role (guardian only)' })
  updateMember(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.households.updateMember(user.id, id, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove a member (guardian only)' })
  removeMember(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.households.removeMember(user.id, id, memberId);
  }

  // -------------------------------------------------------------------------
  // Invites
  // -------------------------------------------------------------------------

  @Post(':id/invites')
  @ApiOperation({ summary: 'Create an invite code (guardian only)' })
  createInvite(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateInviteDto,
  ) {
    return this.households.createInvite(user.id, id, dto);
  }

  @Get(':id/invites')
  @ApiOperation({ summary: 'List active invites (guardian only)' })
  listInvites(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.households.listInvites(user.id, id);
  }

  @Delete(':id/invites/:inviteId')
  @ApiOperation({ summary: 'Revoke an invite (guardian only)' })
  revokeInvite(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('inviteId') inviteId: string,
  ) {
    return this.households.revokeInvite(user.id, id, inviteId);
  }
}
