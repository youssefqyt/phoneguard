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
import { RewardsService } from './rewards.service';
import {
  AwardPointsDto,
  CreateRewardDto,
  DecideRedemptionDto,
  RedeemRewardDto,
  UpdateRewardDto,
} from './dto/reward.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('rewards')
@ApiBearerAuth('access-token')
@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewards: RewardsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a reward (guardian only)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRewardDto) {
    return this.rewards.createReward(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List rewards available in your households' })
  list(@CurrentUser() user: AuthUser, @Query('all') all?: string) {
    return this.rewards.listRewards(user.id, all !== 'true');
  }

  @Get('points')
  @ApiOperation({ summary: 'Get your points ledger' })
  points(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.rewards.pointsHistory(user.id, query);
  }

  @Post('points/grant')
  @ApiOperation({ summary: 'Grant or deduct points (guardian only)' })
  grant(@CurrentUser() user: AuthUser, @Body() dto: AwardPointsDto) {
    return this.rewards.grantPoints(user.id, dto);
  }

  @Get('redemptions')
  @ApiOperation({ summary: 'List reward redemptions visible to you' })
  redemptions(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
    @Query('mine') mine?: string,
  ) {
    return this.rewards.listRedemptions(user.id, query, mine === 'true');
  }

  @Post('redemptions/:id/decide')
  @ApiOperation({ summary: 'Approve or deny a redemption (guardian only)' })
  decide(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: DecideRedemptionDto,
  ) {
    return this.rewards.decideRedemption(user.id, id, dto);
  }

  @Post(':id/redeem')
  @ApiOperation({ summary: 'Redeem a reward with your points' })
  redeem(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RedeemRewardDto,
  ) {
    return this.rewards.redeem(user.id, id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a reward (guardian only)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateRewardDto,
  ) {
    return this.rewards.updateReward(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a reward (guardian only)' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.rewards.removeReward(user.id, id);
  }
}
