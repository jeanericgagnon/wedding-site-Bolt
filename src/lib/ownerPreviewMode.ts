export type OwnerPreviewTargetKind = 'guest' | 'role' | 'public';

export interface OwnerPreviewMode {
  targetKind: OwnerPreviewTargetKind;
  title: string;
  detail: string;
  exitHref: string;
}

const PREVIEW_PARAM_NAMES = [
  'previewGuest',
  'previewRole',
  'previewSurface',
  'previewContext',
  'previewLabel',
];
const PRIVATE_ACCESS_PARAM_NAMES = new Set([
  'apikey',
  'authorization',
  'auth',
  'bearer',
  'invitetoken',
  'jwt',
  'passcode',
  'password',
  'pw',
  'secret',
  'securetoken',
  'signature',
  'token',
  'accesstoken',
]);

const ROLE_LABELS: Record<string, string> = {
  planner: 'planner',
  coordinator: 'coordinator',
  owner: 'owner',
  public: 'public visitor',
};

function normalizeRole(value: string | null): string | null {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z_-]/g, '');
  if (!normalized) return null;
  return ROLE_LABELS[normalized] ?? null;
}

function buildExitHref(pathname: string, searchParams: URLSearchParams, stripPrivateAccess = false): string {
  const next = new URLSearchParams(searchParams);
  PREVIEW_PARAM_NAMES.forEach((name) => next.delete(name));
  if (stripPrivateAccess) {
    Array.from(next.keys()).forEach((name) => {
      const normalizedName = name.trim().toLowerCase().replace(/[-_]/g, '');
      if (PRIVATE_ACCESS_PARAM_NAMES.has(normalizedName)) {
        next.delete(name);
      }
    });
  }
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function getOwnerPreviewMode(
  pathname: string,
  searchParams: URLSearchParams
): OwnerPreviewMode | null {
  const hasGuestPreview = Boolean(searchParams.get('previewGuest')?.trim());
  const roleLabel = normalizeRole(searchParams.get('previewRole'));
  const surface = searchParams.get('previewSurface')?.trim().toLowerCase() ?? '';

  if (!hasGuestPreview && !roleLabel && surface !== 'public') return null;

  if (hasGuestPreview) {
    return {
      targetKind: 'guest',
      title: 'Owner preview mode',
      detail: 'Viewing a guest-specific path. Private event access still follows the saved invitation and visibility settings.',
      exitHref: buildExitHref(pathname, searchParams, true),
    };
  }

  if (roleLabel) {
    return {
      targetKind: 'role',
      title: 'Owner preview mode',
      detail: `Viewing the ${roleLabel} path. Role permissions still follow the saved team access settings.`,
      exitHref: buildExitHref(pathname, searchParams),
    };
  }

  return {
    targetKind: 'public',
    title: 'Owner preview mode',
    detail: 'Viewing the public visitor path. Guest-only details still require the right invitation access.',
    exitHref: buildExitHref(pathname, searchParams),
  };
}
