import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { UsageService } from './usage.service';
import { UsageController } from './usage.controller';

@Module({
  imports: [DevicesModule],
  controllers: [UsageController],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
