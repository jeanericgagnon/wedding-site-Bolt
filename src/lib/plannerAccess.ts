export type PlannerAccessRole = 'owner' | 'planner' | 'coordinator' | 'viewer';
export type PlannerSurface = 'planning' | 'guests' | 'messages' | 'coordinator';

export interface PlannerRoleOption {
  value: PlannerAccessRole;
  label: string;
  description: string;
}

export const PLANNER_ROLE_OPTIONS: PlannerRoleOption[] = [
  {
    value: 'owner',
    label: 'Couple owner',
    description: 'Full control stays with the couple.',
  },
  {
    value: 'planner',
    label: 'Planner',
    description: 'Broad wedding operations access across guests, planning, seating, and day-of coordination.',
  },
  {
    value: 'coordinator',
    label: 'Coordinator',
    description: 'Focused on live event operations, check-in, updates, and day-of support.',
  },
  {
    value: 'viewer',
    label: 'Read only',
    description: 'Can review details without editing.',
  },
];

export function getPlannerAccessStorageKey(surface: PlannerSurface, siteId: string | null | undefined): string | null {
  if (!siteId) return null;
  return `dayof.access.${surface}.${siteId}`;
}

export function readPlannerAccessRole(surface: PlannerSurface, siteId: string | null | undefined): PlannerAccessRole | null {
  const key = getPlannerAccessStorageKey(surface, siteId);
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key) as PlannerAccessRole | null;
    return PLANNER_ROLE_OPTIONS.some((option) => option.value === raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writePlannerAccessRole(surface: PlannerSurface, siteId: string | null | undefined, role: PlannerAccessRole): void {
  const key = getPlannerAccessStorageKey(surface, siteId);
  if (!key) return;
  try {
    localStorage.setItem(key, role);
  } catch {
    // ignore local storage failures
  }
}

export function canEditPlannerSurface(role: PlannerAccessRole): boolean {
  return role !== 'viewer';
}

export function canManagePlanning(role: PlannerAccessRole): boolean {
  return role === 'owner' || role === 'planner' || role === 'coordinator';
}

export function canEditPlanningTasks(role: PlannerAccessRole): boolean {
  return role === 'owner' || role === 'planner' || role === 'coordinator';
}

export function canEditPlanningBudget(role: PlannerAccessRole): boolean {
  return role === 'owner' || role === 'planner';
}

export function canEditPlanningVendors(role: PlannerAccessRole): boolean {
  return role === 'owner' || role === 'planner';
}

export function canComposeDashboardMessages(role: PlannerAccessRole): boolean {
  return role === 'owner' || role === 'planner';
}

export function canSendCoordinatorUpdates(role: PlannerAccessRole): boolean {
  return role === 'owner' || role === 'planner' || role === 'coordinator';
}

export interface PlannerInviteRecord {
  name: string;
  email: string;
  role: Exclude<PlannerAccessRole, 'owner'>;
  status: 'draft' | 'pending' | 'active';
  invitedAtISO: string;
}

export function getPlannerInviteStorageKey(siteId: string | null | undefined): string | null {
  if (!siteId) return null;
  return `dayof.plannerInvite.${siteId}`;
}

export function readPlannerInvite(siteId: string | null | undefined): PlannerInviteRecord | null {
  const key = getPlannerInviteStorageKey(siteId);
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlannerInviteRecord;
    if (!parsed?.name || !parsed?.email || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePlannerInvite(siteId: string | null | undefined, invite: PlannerInviteRecord | null): void {
  const key = getPlannerInviteStorageKey(siteId);
  if (!key) return;
  try {
    if (invite) localStorage.setItem(key, JSON.stringify(invite));
    else localStorage.removeItem(key);
  } catch {
    // ignore local storage failures
  }
}
