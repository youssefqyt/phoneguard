import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeviceStatus, HouseholdRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../common/services/crypto.service';
import { HouseholdAccessService } from '../../common/services/household-access.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { PairDeviceDto, UpdateDeviceDto } from './dto/pair-device.dto';

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly access: HouseholdAccessService,
  ) {}

  /** Registers a device and returns a one-time pairing code. */
  async register(userId: string, dto: RegisterDeviceDto) {
    const device = await this.prisma.device.create({
      data: {
        ownerId: userId,
        name: dto.name,
        platform: dto.platform,
        model: dto.model,
        manufacturer: dto.manufacturer,
        osVersion: dto.osVersion,
        appVersion: dto.appVersion,
        isManaged: dto.isManaged ?? false,
        status: DeviceStatus.PENDING,
        pairingCode: this.crypto.generatePairingCode(),
      },
    });
    return device;
  }

  /**
   * Pairs a pending device into a household using its pairing code.
   * The caller must be a guardian of the target household.
   */
  async pair(userId: string, dto: PairDeviceDto) {
    const device = await this.prisma.device.findUnique({
      where: { pairingCode: dto.code.toUpperCase() },
    });
    if (!device) throw new NotFoundException('Invalid pairing code');
    if (device.status === DeviceStatus.PAIRED) {
      throw new ConflictException('This device has already been paired');
    }
    if (device.status === DeviceStatus.REVOKED) {
      throw new BadRequestException('This device has been revoked');
    }

    let householdId = dto.householdId ?? null;
    if (householdId) {
      await this.access.assertGuardian(userId, householdId);
    } else {
      const guardianships = await this.access.householdIdsForGuardian(userId);
      householdId = guardianships[0] ?? null;
    }

    // A guardian may not pair their own device into their own name — the
    // device stays owned by the account that registered it.
    if (householdId) {
      await this.prisma.householdMember.upsert({
        where: {
          householdId_userId: { householdId, userId: device.ownerId },
        },
        create: {
          householdId,
          userId: device.ownerId,
          role: HouseholdRole.CHILD,
          status: 'ACTIVE',
        },
        update: {},
      });
    }

    return this.prisma.device.update({
      where: { id: device.id },
      data: {
        householdId,
        status: DeviceStatus.PAIRED,
        pairedAt: new Date(),
        isManaged: true,
        pairingCode: null,
      },
    });
  }

  /**
   * Devices the user owns or manages.
   *
   * Revoked devices are excluded by default — they are dead and would
   * otherwise pile up in the UI (every revocation is a soft delete so the
   * audit trail survives). Pass `includeRevoked` to see them.
   */
  async list(userId: string, includeRevoked = false) {
    const householdIds = await this.access.householdIdsForUser(userId);
    const where: Prisma.DeviceWhereInput = {
      ...(includeRevoked ? {} : { status: { not: DeviceStatus.REVOKED } }),
      OR: [
        { ownerId: userId },
        { householdId: { in: householdIds } },
      ],
    };
    return this.prisma.device.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, displayName: true, email: true } },
        household: { select: { id: true, name: true } },
      },
    });
  }

  async getById(userId: string, deviceId: string) {
    const device = await this.findAccessible(userId, deviceId);
    return this.prisma.device.findUnique({
      where: { id: device.id },
      include: {
        owner: { select: { id: true, displayName: true, email: true } },
        household: { select: { id: true, name: true } },
        rules: { where: { enabled: true } },
      },
    });
  }

  async update(userId: string, deviceId: string, dto: UpdateDeviceDto) {
    await this.findAccessible(userId, deviceId);
    return this.prisma.device.update({
      where: { id: deviceId },
      data: {
        name: dto.name,
        pushToken: dto.pushToken,
        appVersion: dto.appVersion,
        osVersion: dto.osVersion,
        lastSeenAt: new Date(),
      },
    });
  }

  /** Lightweight heartbeat used by the mobile client. */
  async heartbeat(userId: string, deviceId: string) {
    await this.findAccessible(userId, deviceId);
    await this.prisma.device.update({
      where: { id: deviceId },
      data: { lastSeenAt: new Date() },
    });
    return { success: true, at: new Date().toISOString() };
  }

  async revoke(userId: string, deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: { id: true, ownerId: true, householdId: true },
    });
    if (!device) throw new NotFoundException('Device not found');

    // Owners may revoke their own device; guardians may revoke household devices.
    const isOwner = device.ownerId === userId;
    let isGuardian = false;
    if (device.householdId) {
      const membership = await this.access.getMembership(userId, device.householdId);
      isGuardian =
        !!membership &&
        membership.status === 'ACTIVE' &&
        (membership.role === HouseholdRole.OWNER ||
          membership.role === HouseholdRole.PARENT);
    }
    if (!isOwner && !isGuardian) {
      throw new ForbiddenException('You cannot revoke this device');
    }

    await this.prisma.device.update({
      where: { id: deviceId },
      data: { status: DeviceStatus.REVOKED, pushToken: null },
    });
    return { success: true };
  }

  /**
   * Resolves a device the user is allowed to see, throwing 404 otherwise.
   * Shared by every module that operates on a device.
   */
  async findAccessible(userId: string, deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: { id: true, ownerId: true, householdId: true, isManaged: true },
    });
    if (!device) throw new NotFoundException('Device not found');
    if (device.ownerId === userId) return device;

    if (device.householdId) {
      const membership = await this.access.getMembership(userId, device.householdId);
      if (membership && membership.status === 'ACTIVE') return device;
    }
    throw new NotFoundException('Device not found');
  }

  /** Used by usage ingestion — device must belong to the caller. */
  async assertOwnership(userId: string, deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: { id: true, ownerId: true },
    });
    if (!device || device.ownerId !== userId) {
      throw new NotFoundException('Device not found');
    }
    return device;
  }
}
