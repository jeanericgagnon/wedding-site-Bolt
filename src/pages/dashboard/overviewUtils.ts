export interface OverviewChecklistStats {
  coupleName1: string;
  coupleName2: string;
  weddingDate: string;
  venueName: string;
  venueLocation: string;
  registryItemCount: number;
  photoAlbumCount: number;
  isPublished: boolean;
  siteSlug: string;
  templateName: string;
}

export interface ChecklistItemDef {
  id: string;
  label: string;
  done: boolean;
  actionLabel: string;
  route: string;
  action?: () => void;
}

const INTELLIGENCE_DISMISSAL_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
const MAX_DISMISSAL_IDS = 80;
const MAX_DISMISSAL_ID_LENGTH = 120;

interface DismissalEnvelope {
  savedAtISO: string;
  ids: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeDismissalIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  value.forEach((item) => {
    if (typeof item !== 'string') return;
    const id = item.trim().slice(0, MAX_DISMISSAL_ID_LENGTH);
    if (!id || seen.has(id)) return;
    seen.add(id);
    normalized.push(id);
  });
  return normalized.slice(0, MAX_DISMISSAL_IDS);
};

const buildDismissalEnvelope = (ids: string[]): DismissalEnvelope => ({
  savedAtISO: new Date().toISOString(),
  ids: normalizeDismissalIds(ids),
});

const isStaleDismissalEnvelope = (savedAtISO: unknown): boolean => {
  if (typeof savedAtISO !== 'string') return true;
  const savedAt = new Date(savedAtISO).getTime();
  return !Number.isFinite(savedAt) || Date.now() - savedAt > INTELLIGENCE_DISMISSAL_RETENTION_MS;
};

export const getPublishBuilderRoute = (isPublished: boolean): string =>
  isPublished ? '/dashboard/builder' : '/dashboard/builder?publishNow=1';

export const readOverviewDismissalIds = (storageKey: string): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const ids = normalizeDismissalIds(parsed);
      if (ids.length > 0) window.localStorage.setItem(storageKey, JSON.stringify(buildDismissalEnvelope(ids)));
      else window.localStorage.removeItem(storageKey);
      return ids;
    }
    if (!isRecord(parsed) || isStaleDismissalEnvelope(parsed.savedAtISO)) {
      window.localStorage.removeItem(storageKey);
      return [];
    }
    const ids = normalizeDismissalIds(parsed.ids);
    if (ids.length === 0) {
      window.localStorage.removeItem(storageKey);
      return [];
    }
    window.localStorage.setItem(storageKey, JSON.stringify(buildDismissalEnvelope(ids)));
    return ids;
  } catch {
    window.localStorage.removeItem(storageKey);
    return [];
  }
};

export const writeOverviewDismissalIds = (storageKey: string, ids: string[]): string[] => {
  const normalized = normalizeDismissalIds(ids);
  if (typeof window === 'undefined') return normalized;
  if (normalized.length === 0) {
    window.localStorage.removeItem(storageKey);
    return normalized;
  }
  window.localStorage.setItem(storageKey, JSON.stringify(buildDismissalEnvelope(normalized)));
  return normalized;
};

export const buildSetupChecklist = (stats: OverviewChecklistStats): ChecklistItemDef[] => [
  {
    id: 'names',
    label: 'Add couple names',
    done: Boolean(stats.coupleName1 && stats.coupleName2),
    actionLabel: 'Edit settings',
    route: '/dashboard/settings',
  },
  {
    id: 'date',
    label: 'Set wedding date',
    done: Boolean(stats.weddingDate),
    actionLabel: 'Edit date',
    route: '/dashboard/settings',
  },
  {
    id: 'venue',
    label: 'Add venue/address',
    done: Boolean(stats.venueName || stats.venueLocation),
    actionLabel: 'Add venue',
    route: '/dashboard/settings',
  },
  {
    id: 'registry',
    label: 'Add at least 1 registry item',
    done: stats.registryItemCount > 0,
    actionLabel: 'Open registry',
    route: '/dashboard/registry',
  },
  {
    id: 'photos',
    label: 'Create first photo sharing album',
    done: stats.photoAlbumCount > 0,
    actionLabel: 'Open photos',
    route: '/dashboard/photos',
  },
  {
    id: 'publish',
    label: 'Go live once',
    done: stats.isPublished,
    actionLabel: stats.isPublished ? 'Edit site' : 'Publish site',
    route: getPublishBuilderRoute(stats.isPublished),
  },
];

export const buildPublishReadinessItems = (stats: OverviewChecklistStats): ChecklistItemDef[] => [
  {
    id: 'names',
    label: 'Couple names are filled in',
    done: Boolean(stats.coupleName1 && stats.coupleName2),
    actionLabel: 'Open settings',
    route: '/dashboard/settings',
  },
  {
    id: 'date',
    label: 'Wedding date is set',
    done: Boolean(stats.weddingDate),
    actionLabel: 'Set date',
    route: '/dashboard/settings',
  },
  {
    id: 'venue',
    label: 'Venue details are ready',
    done: Boolean(stats.venueName || stats.venueLocation),
    actionLabel: 'Add venue',
    route: '/dashboard/settings',
  },
  {
    id: 'slug',
    label: 'Website URL is set',
    done: Boolean(stats.siteSlug),
    actionLabel: 'Open settings',
    route: '/dashboard/settings',
  },
  {
    id: 'template',
    label: 'Design is chosen',
    done: Boolean(stats.templateName),
    actionLabel: 'Open templates',
    route: '/templates',
  },
  {
    id: 'published',
    label: 'Website has gone live once',
    done: Boolean(stats.isPublished),
    actionLabel: stats.isPublished ? 'Edit site' : 'Publish site',
    route: getPublishBuilderRoute(stats.isPublished),
  },
];

export const getFirstIncompleteChecklistItem = (items: ChecklistItemDef[]): ChecklistItemDef | null => {
  return items.find((item) => !item.done) ?? null;
};

export const getChecklistProgress = (items: ChecklistItemDef[]): { done: number; total: number } => ({
  done: items.filter((item) => item.done).length,
  total: items.length,
});

export const getIncompleteChecklistItems = (items: ChecklistItemDef[]): ChecklistItemDef[] =>
  items.filter((item) => !item.done);
