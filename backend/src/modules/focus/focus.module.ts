import { Module, forwardRef } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { RewardsModule } from '../rewards/rewards.module';
import { FocusService } from './focus.service';
import { FocusController } from './focus.controller';

@Module({
  imports: [NotificationsModule, forwardRef(() => RewardsModule)],
  controllers: [FocusController],
  providers: [FocusService],
  exports: [FocusService],
})
export class FocusModule {}
