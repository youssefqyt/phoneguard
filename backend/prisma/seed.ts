/**
 * Seed script — creates a demo family with usage history, rules and rewards.
 * Run with: npm run db:seed
 */
import {
  DeviceStatus,
  HouseholdRole,
  MemberStatus,
  NotificationType,
  Platform,
  PrismaClient,
  RedemptionStatus,
  RewardType,
  RuleAction,
  RuleType,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PARENT_EMAIL = process.env.SEED_PARENT_EMAIL ?? 'parent@phoneguard.dev';
const PARENT_PASSWORD = process.env.SEED_PARENT_PASSWORD ?? 'Password123!';
const CHILD_EMAIL = process.env.SEED_CHILD_EMAIL ?? 'child@phoneguard.dev';
const CHILD_PASSWORD = process.env.SEED_CHILD_PASSWORD ?? 'Password123!';

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

const DEMO_APPS: Array<{
  packageName: string;
  appName: string;
  category: string;
  weight: number;
}> = [
  { packageName: 'com.instagram.android', appName: 'Instagram', category: 'SOCIAL', weight: 0.22 },
  { packageName: 'com.zhiliaoapp.musically', appName: 'TikTok', category: 'SOCIAL', weight: 0.2 },
  { packageName: 'com.google.android.youtube', appName: 'YouTube', category: 'ENTERTAINMENT', weight: 0.18 },
  { packageName: 'com.whatsapp', appName: 'WhatsApp', category: 'COMMUNICATION', weight: 0.14 },
  { packageName: 'com.android.chrome', appName: 'Chrome', category: 'PRODUCTIVITY', weight: 0.12 },
  { packageName: 'com.duolingo', appName: 'Duolingo', category: 'EDUCATION', weight: 0.08 },
  { packageName: 'com.spotify.music', appName: 'Spotify', category: 'ENTERTAINMENT', weight: 0.06 },
];

async function main(): Promise<void> {
  console.log('🌱 Seeding PhoneGuard…');

  await prisma.notification.deleteMany();
  await prisma.pointsLedger.deleteMany();
  await prisma.rewardRedemption.deleteMany();
  await prisma.reward.deleteMany();
  await prisma.limitProgress.deleteMany();
  await prisma.focusSession.deleteMany();
  await prisma.rule.deleteMany();
  await prisma.dailySummary.deleteMany();
  await prisma.appUsageEvent.deleteMany();
  await prisma.appUsageDaily.deleteMany();
  await prisma.device.deleteMany();
  await prisma.householdInvite.deleteMany();
  await prisma.householdMember.deleteMany();
  await prisma.household.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(PARENT_PASSWORD, 12);
  const childHash = await bcrypt.hash(CHILD_PASSWORD, 12);

  const parent = await prisma.user.create({
    data: {
      email: PARENT_EMAIL.toLowerCase(),
      passwordHash,
      displayName: 'Alex Morgan',
      role: UserRole.PARENT,
      timezone: 'Europe/London',
      pointsBalance: 0,
    },
  });

  const child = await prisma.user.create({
    data: {
      email: CHILD_EMAIL.toLowerCase(),
      passwordHash: childHash,
      displayName: 'Sam Morgan',
      role: UserRole.CHILD,
      timezone: 'Europe/London',
      pointsBalance: 240,
    },
  });

  const household = await prisma.household.create({
    data: {
      name: 'The Morgan Family',
      ownerId: parent.id,
      members: {
        create: [
          { userId: parent.id, role: HouseholdRole.OWNER, status: MemberStatus.ACTIVE },
          { userId: child.id, role: HouseholdRole.CHILD, status: MemberStatus.ACTIVE },
        ],
      },
    },
  });

  const device = await prisma.device.create({
    data: {
      ownerId: child.id,
      householdId: household.id,
      name: "Sam's Pixel 8",
      model: 'Pixel 8',
      manufacturer: 'Google',
      platform: Platform.ANDROID,
      osVersion: '14',
      appVersion: '1.0.0',
      status: DeviceStatus.PAIRED,
      isManaged: true,
      pairedAt: new Date(),
      lastSeenAt: new Date(),
      lastSyncedAt: new Date(),
    },
  });

  const otherDevice = await prisma.device.create({
    data: {
      ownerId: parent.id,
      householdId: household.id,
      name: "Alex's iPhone 15",
      model: 'iPhone 15',
      manufacturer: 'Apple',
      platform: Platform.IOS,
      osVersion: '17.5',
      appVersion: '1.0.0',
      status: DeviceStatus.PAIRED,
      isManaged: false,
      pairedAt: new Date(),
      lastSeenAt: new Date(),
    },
  });

  // ---- 14 days of usage history -------------------------------------------
  const today = startOfUtcDay(new Date());
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset);
    const weekend = [0, 6].includes(date.getUTCDay());
    const baseMinutes = weekend ? 320 : 210;
    const jitter = Math.round((Math.random() - 0.5) * 60);
    const totalMinutes = Math.max(60, baseMinutes + jitter);
    const totalSeconds = totalMinutes * 60;

    let allocated = 0;
    const perApp = DEMO_APPS.map((app, index) => {
      const isLast = index === DEMO_APPS.length - 1;
      const seconds = isLast
        ? Math.max(0, totalSeconds - allocated)
        : Math.round(totalSeconds * app.weight);
      allocated += seconds;
      return {
        ...app,
        totalSeconds: seconds,
        launches: Math.max(1, Math.round(seconds / 300)),
      };
    });

    await prisma.appUsageDaily.createMany({
      data: perApp.map((app) => ({
        deviceId: device.id,
        date,
        packageName: app.packageName,
        appName: app.appName,
        category: app.category,
        totalSeconds: app.totalSeconds,
        launches: app.launches,
        lastUsedAt: addDays(date, 0),
      })),
    });

    await prisma.dailySummary.create({
      data: {
        deviceId: device.id,
        date,
        screenTimeSeconds: totalSeconds,
        pickups: 40 + Math.round(Math.random() * 60),
        notifications: 90 + Math.round(Math.random() * 120),
        unlocks: 30 + Math.round(Math.random() * 50),
        focusSeconds: Math.round(Math.random() * 3600),
      },
    });
  }

  // ---- Rules --------------------------------------------------------------
  await prisma.rule.createMany({
    data: [
      {
        householdId: household.id,
        name: 'Social media limit',
        type: RuleType.APP_LIMIT,
        action: RuleAction.BLOCK,
        enabled: true,
        priority: 10,
        config: {
          packages: ['com.instagram.android', 'com.zhiliaoapp.musically'],
          dailyLimitMinutes: 45,
        },
      },
      {
        householdId: household.id,
        name: 'Entertainment cap',
        type: RuleType.CATEGORY_LIMIT,
        action: RuleAction.WARN,
        enabled: true,
        priority: 5,
        config: { category: 'ENTERTAINMENT', dailyLimitMinutes: 90 },
      },
      {
        householdId: household.id,
        name: 'School hours',
        type: RuleType.SCHEDULE,
        action: RuleAction.BLOCK,
        enabled: true,
        priority: 20,
        config: {
          days: [1, 2, 3, 4, 5],
          startTime: '08:30',
          endTime: '15:30',
        },
      },
      {
        householdId: household.id,
        name: 'Bedtime',
        type: RuleType.BEDTIME,
        action: RuleAction.REMIND,
        enabled: true,
        priority: 30,
        config: {
          days: [1, 2, 3, 4, 5, 6, 7],
          startTime: '21:30',
          endTime: '07:00',
        },
      },
    ],
  });

  // ---- Rewards ------------------------------------------------------------
  const reward1 = await prisma.reward.create({
    data: {
      householdId: household.id,
      title: '1 hour extra screen time',
      description: 'Redeem for an extra hour today',
      type: RewardType.SCREEN_TIME,
      pointCost: 120,
      valueMinutes: 60,
      icon: 'clock',
    },
  });

  await prisma.reward.create({
    data: {
      householdId: household.id,
      title: 'Unlock Instagram for 30 minutes',
      description: 'Temporary access to a limited app',
      type: RewardType.APP_UNLOCK,
      pointCost: 80,
      valueMinutes: 30,
      targetPackage: 'com.instagram.android',
      icon: 'unlock',
    },
  });

  await prisma.reward.create({
    data: {
      householdId: household.id,
      title: 'Pick a family movie',
      description: 'You choose what we watch on Friday',
      type: RewardType.PRIVILEGE,
      pointCost: 150,
      valueMinutes: 0,
      icon: 'movie',
    },
  });

  // ---- Points ledger + a pending redemption -------------------------------
  await prisma.pointsLedger.createMany({
    data: [
      { userId: child.id, delta: 200, reason: 'Welcome bonus' },
      { userId: child.id, delta: 40, reason: 'Focus session completed', refType: 'focus' },
    ],
  });

  await prisma.rewardRedemption.create({
    data: {
      rewardId: reward1.id,
      userId: child.id,
      pointCost: reward1.pointCost,
      status: RedemptionStatus.REQUESTED,
      note: 'I finished all my homework!',
    },
  });

  // ---- A few notifications ------------------------------------------------
  await prisma.notification.createMany({
    data: [
      {
        userId: parent.id,
        type: NotificationType.REWARD_REQUESTED,
        title: 'New reward request',
        body: 'Sam requested: 1 hour extra screen time',
      },
      {
        userId: child.id,
        type: NotificationType.LIMIT_REACHED,
        title: 'Daily limit reached',
        body: 'You reached your Instagram limit for today',
      },
    ],
  });

  console.log('✅ Seed complete');
  console.log(`   Parent : ${PARENT_EMAIL} / ${PARENT_PASSWORD}`);
  console.log(`   Child  : ${CHILD_EMAIL} / ${CHILD_PASSWORD}`);
  console.log(`   Devices: ${device.name}, ${otherDevice.name}`);
  console.log(`   Household: ${household.name}`);
}

main()
  .catch((error) => {
    console.error('❌ Seed failed', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
