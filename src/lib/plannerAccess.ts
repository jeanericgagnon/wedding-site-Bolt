export type PlannerAccessRole = 'owner' | 'planner' | 'coordinator' | 'viewer';
export type PlannerSurface = 'planning' | 'guests' | 'messages' | 'coordinator';
const PLANNER_ACCESS_ROLES: PlannerAccessRole[] = ['owner', 'planner', 'coordinator', 'viewer'];
const PLANNER_COLLABORATOR_ROLES: Array<Exclude<PlannerAccessRole, 'owner'>> = ['planner', 'coordinator', 'viewer'];

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
    description: 'Broad planning access across guests, tasks, seating, and day-of coordination.',
  },
  {
    value: 'coordinator',
    label: 'Coordinator',
    description: 'Focused on check-in, updates, and day-of support.',
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

export function isPlannerAccessRole(value: unknown): value is PlannerAccessRole {
  return typeof value === 'string' && PLANNER_ACCESS_ROLES.includes(value as PlannerAccessRole);
}

export function isPlannerCollaboratorRole(value: unknown): value is Exclude<PlannerAccessRole, 'owner'> {
  return typeof value === 'string' && PLANNER_COLLABORATOR_ROLES.includes(value as Exclude<PlannerAccessRole, 'owner'>);
}

export function hasPlannerPermission(
  role: PlannerAccessRole,
  permissions: PlannerPermissionKey[] | null | undefined,
  permission: PlannerPermissionKey,
): boolean {
  if (role === 'owner') return true;
  if (role === 'viewer') return false;
  if (Array.isArray(permissions)) return permissions.includes(permission);
  return getPlannerPermissionPreset(role as Exclude<PlannerAccessRole, 'owner'>).includes(permission);
}

export function canManagePlanning(role: PlannerAccessRole, permissions?: PlannerPermissionKey[] | null): boolean {
  return hasPlannerPermission(role, permissions, 'planning');
}

export function canEditPlanningTasks(role: PlannerAccessRole, permissions?: PlannerPermissionKey[] | null): boolean {
  return hasPlannerPermission(role, permissions, 'planning');
}

export function canEditPlanningBudget(role: PlannerAccessRole, permissions?: PlannerPermissionKey[] | null): boolean {
  return hasPlannerPermission(role, permissions, 'budget');
}

export function canEditPlanningVendors(role: PlannerAccessRole, permissions?: PlannerPermissionKey[] | null): boolean {
  return hasPlannerPermission(role, permissions, 'vendors');
}

export function canComposeDashboardMessages(role: PlannerAccessRole, permissions?: PlannerPermissionKey[] | null): boolean {
  return hasPlannerPermission(role, permissions, 'messages');
}

export function canSendCoordinatorUpdates(role: PlannerAccessRole, permissions?: PlannerPermissionKey[] | null): boolean {
  return hasPlannerPermission(role, permissions, 'coordinator');
}

export function canManageGuests(role: PlannerAccessRole, permissions?: PlannerPermissionKey[] | null): boolean {
  return hasPlannerPermission(role, permissions, 'guests');
}

export function canManageSeating(role: PlannerAccessRole, permissions?: PlannerPermissionKey[] | null): boolean {
  return hasPlannerPermission(role, permissions, 'seating');
}

export function canManageRegistry(role: PlannerAccessRole, permissions?: PlannerPermissionKey[] | null): boolean {
  return hasPlannerPermission(role, permissions, 'registry');
}

export function canManagePhotos(role: PlannerAccessRole, permissions?: PlannerPermissionKey[] | null): boolean {
  return hasPlannerPermission(role, permissions, 'photos');
}

export function canManageSettings(role: PlannerAccessRole, permissions?: PlannerPermissionKey[] | null): boolean {
  return hasPlannerPermission(role, permissions, 'settings');
}

export interface PlannerInviteRecord {
  name: string;
  email: string;
  role: Exclude<PlannerAccessRole, 'owner'>;
  status: 'draft' | 'pending' | 'active';
  invitedAtISO: string;
  permissions?: PlannerPermissionKey[];
}

export const MAX_PLANNER_INVITE_STORAGE_AGE_MS = 1000 * 60 * 60 * 24 * 30;
export const PLANNER_INVITE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const PLANNER_INVITE_STATUSES: PlannerInviteRecord['status'][] = ['draft', 'pending', 'active'];

export function getPlannerInviteStorageKey(siteId: string | null | undefined): string | null {
  if (!siteId) return null;
  return `dayof.plannerInvite.${siteId}`;
}

export function normalizePlannerInvite(value: unknown): PlannerInviteRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const invite = value as Partial<PlannerInviteRecord>;
  if (!invite.name || !invite.email || !invite.role || !invite.invitedAtISO) return null;
  if (!isPlannerCollaboratorRole(invite.role)) return null;
  const status = invite.status ?? 'draft';
  if (!PLANNER_INVITE_STATUSES.includes(status)) return null;
  if (!PLANNER_INVITE_EMAIL_PATTERN.test(invite.email.trim())) return null;
  const invitedAt = Date.parse(invite.invitedAtISO);
  if (Number.isNaN(invitedAt)) return null;
  if (Date.now() - invitedAt > MAX_PLANNER_INVITE_STORAGE_AGE_MS) return null;
  const permissions = Array.isArray(invite.permissions) ? normalizePlannerPermissions(invite.permissions) : undefined;
  return {
    name: invite.name,
    email: invite.email.trim(),
    role: invite.role,
    status,
    invitedAtISO: invite.invitedAtISO,
    permissions,
  };
}

export function readPlannerInvite(siteId: string | null | undefined): PlannerInviteRecord | null {
  const key = getPlannerInviteStorageKey(siteId);
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const normalized = normalizePlannerInvite(JSON.parse(raw));
    if (!normalized) {
      localStorage.removeItem(key);
      return null;
    }
    return normalized;
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

export type PlannerPermissionKey =
  | 'guests'
  | 'messages'
  | 'planning'
  | 'budget'
  | 'vendors'
  | 'seating'
  | 'timeline'
  | 'coordinator'
  | 'photos'
  | 'registry'
  | 'settings';

export interface PlannerPermissionPreset {
  role: Exclude<PlannerAccessRole, 'owner'>;
  permissions: PlannerPermissionKey[];
}

export const PLANNER_PERMISSION_GROUPS: Array<{
  key: PlannerPermissionKey;
  label: string;
  description: string;
}> = [
  { key: 'guests', label: 'Guests', description: 'View and manage guest list + RSVP data.' },
  { key: 'messages', label: 'Messages', description: 'Draft and send guest communication.' },
  { key: 'planning', label: 'Planning', description: 'Work inside planning boards and tasks.' },
  { key: 'budget', label: 'Budget', description: 'Edit budget details.' },
  { key: 'vendors', label: 'Vendors', description: 'Manage vendor details and contacts.' },
  { key: 'seating', label: 'Seating', description: 'Edit seating charts and assignments.' },
  { key: 'timeline', label: 'Timeline', description: 'Update itinerary and event schedule.' },
  { key: 'coordinator', label: 'Day-of coordination', description: 'Use day-of view and live support tools.' },
  { key: 'photos', label: 'Photos & media', description: 'Manage uploads, vault, and media flows.' },
  { key: 'registry', label: 'Registry', description: 'View or manage registry tools.' },
  { key: 'settings', label: 'Settings', description: 'Access site settings (not billing).' },
];

export function normalizePlannerPermissions(value: unknown): PlannerPermissionKey[] {
  if (!Array.isArray(value)) return [];
  const known = new Set(PLANNER_PERMISSION_GROUPS.map((group) => group.key));
  return value.filter((permission): permission is PlannerPermissionKey =>
    typeof permission === 'string' && known.has(permission as PlannerPermissionKey));
}

export const PLANNER_PERMISSION_PRESETS: PlannerPermissionPreset[] = [
  {
    role: 'planner',
    permissions: ['guests', 'messages', 'planning', 'budget', 'vendors', 'seating', 'timeline', 'coordinator', 'photos', 'registry', 'settings'],
  },
  {
    role: 'coordinator',
    permissions: ['guests', 'messages', 'planning', 'seating', 'timeline', 'coordinator', 'photos'],
  },
  {
    role: 'viewer',
    permissions: [],
  },
];

export function getPlannerPermissionPreset(role: Exclude<PlannerAccessRole, 'owner'>): PlannerPermissionKey[] {
  return PLANNER_PERMISSION_PRESETS.find((preset) => preset.role === role)?.permissions ?? [];
}

export function derivePlannerRoleFromPermissions(permissions: PlannerPermissionKey[] | null | undefined): PlannerAccessRole {
  if (permissions == null) return 'owner';
  const set = new Set(permissions ?? []);
  if (set.size === 0) return 'viewer';
  const plannerPreset = new Set(getPlannerPermissionPreset('planner'));
  const coordinatorPreset = new Set(getPlannerPermissionPreset('coordinator'));
  const viewerPreset = new Set(getPlannerPermissionPreset('viewer'));
  const same = (a: Set<PlannerPermissionKey>, b: Set<PlannerPermissionKey>) => a.size === b.size && [...a].every((item) => b.has(item));
  if (same(set, plannerPreset)) return 'planner';
  if (same(set, coordinatorPreset)) return 'coordinator';
  if (same(set, viewerPreset)) return 'viewer';
  if (set.has('budget') || set.has('vendors') || set.has('settings')) return 'planner';
  if (set.has('coordinator') || set.has('seating')) return 'coordinator';
  return 'viewer';
}
