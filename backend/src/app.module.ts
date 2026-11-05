import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HouseholdsModule } from './modules/households/households.module';
import { DevicesModule } from './modules/devices/devices.module';
import { UsageModule } from './modules/usage/usage.module';
import { RulesModule } from './modules/rules/rules.module';
import { FocusModule } from './modules/focus/focus.module';
import { RewardsModule } from './modules/rewards/rewards.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthController } from './health.controller';

import { MetricsController } from './metrics/metrics.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          { ttl: 60_000, limit: 120 },
        ],
      }),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    HouseholdsModule,
    DevicesModule,
    UsageModule,
    RulesModule,
    FocusModule,
    RewardsModule,
    NotificationsModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
