import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { RulesService } from './rules.service';
import { RulesController } from './rules.controller';

@Module({
  imports: [DevicesModule],
  controllers: [RulesController],
  providers: [RulesService],
  exports: [RulesService],
})
export class RulesModule {}
