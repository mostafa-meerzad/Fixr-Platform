import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { JobStatus, UserRole } from '@prisma/client';

interface Transition {
  from: JobStatus[];
  allowedRoles: UserRole[];
  timestampField?: string;
}

// Maps each target status to its allowed source states and who can trigger it
const TRANSITIONS: Record<string, Transition> = {
  [JobStatus.OPEN]: {
    from: [JobStatus.DRAFT],
    allowedRoles: [UserRole.HOMEOWNER],
    timestampField: 'openedAt',
  },
  [JobStatus.ASSIGNED]: {
    // Triggered internally when homeowner accepts a bid — not a direct API call
    from: [JobStatus.OPEN],
    allowedRoles: [UserRole.HOMEOWNER],
    timestampField: 'assignedAt',
  },
  [JobStatus.EN_ROUTE]: {
    from: [JobStatus.ASSIGNED],
    allowedRoles: [UserRole.EXPERT],
    timestampField: 'expertEnRouteAt',
  },
  [JobStatus.ARRIVED]: {
    from: [JobStatus.EN_ROUTE],
    allowedRoles: [UserRole.EXPERT],
    timestampField: 'expertArrivedAt',
  },
  [JobStatus.IN_PROGRESS]: {
    from: [JobStatus.ARRIVED],
    allowedRoles: [UserRole.EXPERT],
    timestampField: 'inProgressAt',
  },
  [JobStatus.COMPLETION_REQUESTED]: {
    from: [JobStatus.IN_PROGRESS],
    allowedRoles: [UserRole.EXPERT],
    timestampField: 'completionRequestedAt',
  },
  [JobStatus.COMPLETED]: {
    from: [JobStatus.COMPLETION_REQUESTED],
    allowedRoles: [UserRole.HOMEOWNER],
    timestampField: 'completedAt',
  },
  [JobStatus.CANCELLED]: {
    from: [
      JobStatus.OPEN,
      JobStatus.ASSIGNED,
      JobStatus.EN_ROUTE,
      JobStatus.ARRIVED,
      JobStatus.IN_PROGRESS,
    ],
    allowedRoles: [UserRole.HOMEOWNER],
    timestampField: 'cancelledAt',
  },
  [JobStatus.DISPUTED]: {
    from: [
      JobStatus.ASSIGNED,
      JobStatus.EN_ROUTE,
      JobStatus.ARRIVED,
      JobStatus.IN_PROGRESS,
      JobStatus.COMPLETION_REQUESTED,
    ],
    allowedRoles: [UserRole.HOMEOWNER, UserRole.EXPERT],
  },
};

export function assertTransitionAllowed(
  currentStatus: JobStatus,
  targetStatus: JobStatus,
  actorRole: UserRole,
): void {
  const rule = TRANSITIONS[targetStatus];

  if (!rule) {
    throw new BadRequestException(`Transition to ${targetStatus} is not supported.`);
  }

  if (!rule.from.includes(currentStatus)) {
    throw new BadRequestException(
      `Cannot move job from ${currentStatus} to ${targetStatus}.`,
    );
  }

  if (!rule.allowedRoles.includes(actorRole)) {
    throw new ForbiddenException(
      `Only ${rule.allowedRoles.join(' or ')} can perform this action.`,
    );
  }
}

export function getTimestampUpdate(targetStatus: JobStatus): Record<string, Date> {
  const rule = TRANSITIONS[targetStatus];
  if (!rule?.timestampField) return {};
  return { [rule.timestampField]: new Date() };
}
