export type ArchiveModeState = 'planning' | 'live-week' | 'post-wedding' | 'archived';

export interface ArchiveModeInput {
  weddingDate?: string | null;
  archivedAt?: string | null;
}

export interface ArchiveModeDescriptor {
  state: ArchiveModeState;
  label: string;
  detail: string;
  isArchiveLike: boolean;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function normalizeArchiveModeWeddingDate(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10) === trimmed ? `${trimmed}T00:00:00Z` : null;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : trimmed;
}

export function getArchiveModeDescriptor(input: ArchiveModeInput): ArchiveModeDescriptor {
  if (input.archivedAt) {
    return {
      state: 'archived',
      label: 'Archive mode',
      detail: 'Planning urgency should quiet down here so the site can shift into memory and keepsake mode.',
      isArchiveLike: true,
    };
  }

  const normalizedWeddingDate = normalizeArchiveModeWeddingDate(input.weddingDate);

  if (!normalizedWeddingDate) {
    return {
      state: 'planning',
      label: 'Planning mode',
      detail: 'The wedding is still being prepared, so planning and guest needs stay front and center.',
      isArchiveLike: false,
    };
  }

  const today = startOfDay(new Date());
  const weddingDay = startOfDay(new Date(normalizedWeddingDate));
  const diffDays = Math.round((weddingDay.getTime() - today.getTime()) / 86400000);

  if (diffDays <= 7 && diffDays >= -1) {
    return {
      state: 'live-week',
      label: 'Live wedding week',
      detail: 'Coordination, guest comms, seating, and timing should stay prominent during the final push.',
      isArchiveLike: false,
    };
  }

  if (diffDays < -1) {
    return {
      state: 'post-wedding',
      label: 'Post-wedding transition',
      detail: 'The event is behind you. This is where dayof can start shifting from planning into archive and memory mode.',
      isArchiveLike: true,
    };
  }

  return {
    state: 'planning',
    label: 'Planning mode',
    detail: 'The wedding is still ahead, so planning and guest needs should remain primary.',
    isArchiveLike: false,
  };
}
