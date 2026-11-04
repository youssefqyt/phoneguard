import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HouseholdRole, MemberStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../common/services/crypto.service';
import { HouseholdAccessService } from '../../common/services/household-access.service';
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

@Injectable()
export class HouseholdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly access: HouseholdAccessService,
  ) {}

  async create(userId: string, dto: CreateHouseholdDto) {
    return this.prisma.household.create({
      data: {
        name: dto.name,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: HouseholdRole.OWNER,
            status: MemberStatus.ACTIVE,
          },
        },
      },
      include: { members: { include: { user: true } } },
    });
  }

  async listForUser(userId: string) {
    return this.prisma.household.findMany({
      where: { members: { some: { userId, status: MemberStatus.ACTIVE } } },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        },
        _count: { select: { devices: true, rules: true, rewards: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getById(userId: string, householdId: string) {
    await this.access.assertMember(userId, householdId);
    const household = await this.prisma.household.findUnique({
      where: { id: householdId },
      include: {
        members: { include: { user: true } },
        devices: true,
        _count: { select: { devices: true, rules: true, rewards: true } },
      },
    });
    if (!household) throw new NotFoundException('Household not found');
    return household;
  }

  async update(userId: string, householdId: string, dto: UpdateHouseholdDto) {
    await this.access.assertGuardian(userId, householdId);
    return this.prisma.household.update({
      where: { id: householdId },
      data: { name: dto.name },
    });
  }

  async remove(userId: string, householdId: string) {
    const household = await this.prisma.household.findUnique({
      where: { id: householdId },
      select: { ownerId: true },
    });
    if (!household) throw new NotFoundException('Household not found');
    if (household.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can delete a household');
    }
    await this.prisma.household.delete({ where: { id: householdId } });
    return { success: true };
  }

  // -------------------------------------------------------------------------
  // Members
  // -------------------------------------------------------------------------

  async listMembers(userId: string, householdId: string) {
    await this.access.assertMember(userId, householdId);
    return this.prisma.householdMember.findMany({
      where: { householdId },
      include: { user: true },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async addMember(userId: string, householdId: string, dto: AddMemberDto) {
    await this.access.assertGuardian(userId, householdId);

    const target = await this.prisma.user.findFirst({
      where: dto.user.includes('@')
        ? { email: dto.user.toLowerCase() }
        : { id: dto.user },
      select: { id: true },
    });
    if (!target) {
      throw new NotFoundException('No user found for that id or email');
    }

    const existing = await this.access.getMembership(target.id, householdId);
    if (existing) {
      throw new ConflictException('That user is already a member');
    }

    return this.prisma.householdMember.create({
      data: {
        householdId,
        userId: target.id,
        role: dto.role,
        status: MemberStatus.ACTIVE,
      },
      include: { user: true },
    });
  }

  async updateMember(
    userId: string,
    householdId: string,
    memberId: string,
    dto: UpdateMemberDto,
  ) {
    await this.access.assertGuardian(userId, householdId);
    const member = await this.prisma.householdMember.findUnique({
      where: { id: memberId },
    });
    if (!member || member.householdId !== householdId) {
      throw new NotFoundException('Member not found');
    }
    if (member.role === HouseholdRole.OWNER) {
      throw new BadRequestException('The owner role cannot be changed');
    }
    return this.prisma.householdMember.update({
      where: { id: memberId },
      data: { role: dto.role },
      include: { user: true },
    });
  }

  async removeMember(userId: string, householdId: string, memberId: string) {
    const requester = await this.access.assertGuardian(userId, householdId);
    const member = await this.prisma.householdMember.findUnique({
      where: { id: memberId },
    });
    if (!member || member.householdId !== householdId) {
      throw new NotFoundException('Member not found');
    }
    if (member.role === HouseholdRole.OWNER) {
      throw new BadRequestException('The owner cannot be removed');
    }
    // A guardian may remove themselves, or anyone with a lower role.
    if (member.userId !== requester.userId && requester.role !== HouseholdRole.OWNER) {
      throw new ForbiddenException('Only the owner can remove other guardians');
    }
    await this.prisma.householdMember.delete({ where: { id: memberId } });
    return { success: true };
  }

  // -------------------------------------------------------------------------
  // Invites
  // -------------------------------------------------------------------------

  async createInvite(
    userId: string,
    householdId: string,
    dto: CreateInviteDto,
  ) {
    await this.access.assertGuardian(userId, householdId);
    const days = dto.expiresInDays ?? 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return this.prisma.householdInvite.create({
      data: {
        householdId,
        code: this.crypto.generateToken(9),
        email: dto.email?.toLowerCase(),
        role: dto.role ?? HouseholdRole.CHILD,
        expiresAt,
        createdById: userId,
      },
    });
  }

  async listInvites(userId: string, householdId: string) {
    await this.access.assertGuardian(userId, householdId);
    return this.prisma.householdInvite.findMany({
      where: { householdId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeInvite(userId: string, householdId: string, inviteId: string) {
    await this.access.assertGuardian(userId, householdId);
    const invite = await this.prisma.householdInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite || invite.householdId !== householdId) {
      throw new NotFoundException('Invite not found');
    }
    await this.prisma.householdInvite.delete({ where: { id: inviteId } });
    return { success: true };
  }

  async acceptInvite(userId: string, dto: AcceptInviteDto) {
    const invite = await this.prisma.householdInvite.findUnique({
      where: { code: dto.code },
    });
    if (
      !invite ||
      invite.acceptedAt ||
      invite.expiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('This invite is invalid or has expired');
    }

    const existing = await this.access.getMembership(userId, invite.householdId);
    if (existing) {
      throw new ConflictException('You are already a member of this household');
    }

    const [, member] = await this.prisma.$transaction([
      this.prisma.householdInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
      this.prisma.householdMember.create({
        data: {
          householdId: invite.householdId,
          userId,
          role: invite.role,
          status: MemberStatus.ACTIVE,
        },
        include: { household: true },
      }),
    ]);

    return member;
  }
}
