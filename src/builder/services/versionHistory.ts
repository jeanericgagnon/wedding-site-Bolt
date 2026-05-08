import type { BuilderProject } from '../../types/builder/project';
import type { WeddingDataV1 } from '../../types/weddingData';

export interface BuilderRevision {
  id: string;
  weddingId: string;
  action: 'save' | 'publish' | 'rollback';
  actor: string;
  createdAtISO: string;
  project: BuilderProject;
  weddingData?: WeddingDataV1;
}

const MAX_REVISIONS = 10;
export const BUILDER_REVISION_RETENTION_MS = 1000 * 60 * 60 * 24 * 30;
const memoryStore = new Map<string, BuilderRevision[]>();

type BuilderRevisionEnvelope = {
  savedAtISO: string;
  revisions: BuilderRevision[];
};

function keyForWedding(weddingId: string): string {
  return `builder:revisions:${weddingId}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function hasUsableLocalStorage(): boolean {
  return typeof window !== 'undefined'
    && typeof window.localStorage !== 'undefined'
    && typeof window.localStorage?.getItem === 'function'
    && typeof window.localStorage?.setItem === 'function'
    && typeof window.localStorage?.removeItem === 'function';
}

function normalizeRevision(value: unknown): BuilderRevision | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<BuilderRevision>;
  if (!raw.project || typeof raw.project !== 'object') return null;
  const createdAt = typeof raw.createdAtISO === 'string' ? Date.parse(raw.createdAtISO) : NaN;
  if (!Number.isFinite(createdAt) || Date.now() - createdAt > BUILDER_REVISION_RETENTION_MS) return null;

  const action = raw.action === 'publish' || raw.action === 'rollback' ? raw.action : 'save';
  const weddingId = String(raw.weddingId ?? '').trim().slice(0, 120);
  const id = String(raw.id ?? '').trim().slice(0, 160);
  if (!weddingId || !id) return null;

  return {
    id,
    weddingId,
    action,
    actor: String(raw.actor ?? 'system').replace(/\s+/g, ' ').trim().slice(0, 120) || 'system',
    createdAtISO: new Date(createdAt).toISOString(),
    project: clone(raw.project) as BuilderProject,
    weddingData: raw.weddingData ? clone(raw.weddingData) as WeddingDataV1 : undefined,
  };
}

function normalizeRevisions(value: unknown): BuilderRevision[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeRevision)
    .filter((revision): revision is BuilderRevision => Boolean(revision))
    .sort((a, b) => Date.parse(b.createdAtISO) - Date.parse(a.createdAtISO))
    .slice(0, MAX_REVISIONS);
}

function buildEnvelope(revisions: BuilderRevision[]): BuilderRevisionEnvelope {
  return {
    savedAtISO: new Date().toISOString(),
    revisions: normalizeRevisions(revisions),
  };
}

function readRaw(weddingId: string): BuilderRevision[] {
  if (!hasUsableLocalStorage()) {
    return clone(normalizeRevisions(memoryStore.get(weddingId) ?? []));
  }

  const raw = window.localStorage.getItem(keyForWedding(weddingId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as BuilderRevision[] | BuilderRevisionEnvelope;
    const revisions = Array.isArray(parsed)
      ? normalizeRevisions(parsed)
      : normalizeRevisions(parsed?.revisions);
    if (revisions.length === 0) {
      window.localStorage.removeItem(keyForWedding(weddingId));
      return [];
    }
    if (Array.isArray(parsed) || JSON.stringify((parsed as BuilderRevisionEnvelope).revisions) !== JSON.stringify(revisions)) {
      window.localStorage.setItem(keyForWedding(weddingId), JSON.stringify(buildEnvelope(revisions)));
    }
    return revisions;
  } catch {
    window.localStorage.removeItem(keyForWedding(weddingId));
    return [];
  }
}

function writeRaw(weddingId: string, revisions: BuilderRevision[]) {
  const normalized = normalizeRevisions(revisions);
  if (!hasUsableLocalStorage()) {
    memoryStore.set(weddingId, clone(normalized));
    return;
  }
  if (normalized.length === 0) {
    window.localStorage.removeItem(keyForWedding(weddingId));
    return;
  }
  window.localStorage.setItem(keyForWedding(weddingId), JSON.stringify(buildEnvelope(normalized)));
}

export function recordBuilderRevision(params: {
  weddingId: string;
  project: BuilderProject;
  weddingData?: WeddingDataV1;
  action: BuilderRevision['action'];
  actor?: string;
}) {
  const now = new Date().toISOString();
  const next: BuilderRevision = {
    id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    weddingId: params.weddingId,
    action: params.action,
    actor: params.actor ?? 'system',
    createdAtISO: now,
    project: clone(params.project),
    weddingData: params.weddingData ? clone(params.weddingData) : undefined,
  };

  const revisions = [next, ...readRaw(params.weddingId)];
  writeRaw(params.weddingId, revisions);
  return next;
}

export function listBuilderRevisions(weddingId: string): BuilderRevision[] {
  return readRaw(weddingId).slice(0, 5);
}

export function getBuilderRevision(weddingId: string, revisionId: string): BuilderRevision | null {
  const rev = readRaw(weddingId).find((r) => r.id === revisionId);
  return rev ? clone(rev) : null;
}
