import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { HouseholdRole, type HouseholdMember } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const GUARDIAN_ROLES: HouseholdRole[] = [
  HouseholdRole.OWNER,
  HouseholdRole.PARENT,
];

/**
 * Central place for household membership / authorisation checks so that
 * feature modules (rules, rewards, usage, …) do not duplicate the logic.
 */
@Injectable()
export class HouseholdAccessService {
  constructor(private readonly prisma: PrismaService) {}

  static readonly GUARDIAN_ROLES = GUARDIAN_ROLES;
  static readonly ALL_ROLES = Object.values(HouseholdRole);

  async getMembership(
    userId: string,
    householdId: string,
  ): Promise<HouseholdMember | null> {
    return this.prisma.householdMember.findUnique({
      where: { householdId_userId: { householdId, userId } },
    });
  }

  async assertMember(
    userId: string,
    householdId: string,
    roles?: HouseholdRole[],
  ): Promise<HouseholdMember> {
    const household = await this.prisma.household.findUnique({
      where: { id: householdId },
      select: { id: true },
    });
    if (!household) throw new NotFoundException('Household not found');

    const member = await this.getMembership(userId, householdId);
    if (!member || member.status !== 'ACTIVE') {
      throw new ForbiddenException('You are not a member of this household');
    }
    if (roles && roles.length > 0 && !roles.includes(member.role)) {
      throw new ForbiddenException(
        `This action requires one of: ${roles.join(', ')}`,
      );
    }
    return member;
  }

  async assertGuardian(
    userId: string,
    householdId: string,
  ): Promise<HouseholdMember> {
    return this.assertMember(userId, householdId, GUARDIAN_ROLES);
  }

  async householdIdsForUser(userId: string): Promise<string[]> {
    const memberships = await this.prisma.householdMember.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { householdId: true },
    });
    return memberships.map((m) => m.householdId);
  }

  /** Household ids (active) the user belongs to, optionally as a guardian. */
  async householdIdsForGuardian(userId: string): Promise<string[]> {
    const memberships = await this.prisma.householdMember.findMany({
      where: { userId, status: 'ACTIVE', role: { in: GUARDIAN_ROLES } },
      select: { householdId: true },
    });
    return memberships.map((m) => m.householdId);
  }
}
