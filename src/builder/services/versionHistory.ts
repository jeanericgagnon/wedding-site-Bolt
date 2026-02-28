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
const memoryStore = new Map<string, BuilderRevision[]>();

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
    && typeof window.localStorage?.setItem === 'function';
}

function readRaw(weddingId: string): BuilderRevision[] {
  if (!hasUsableLocalStorage()) {
    return clone(memoryStore.get(weddingId) ?? []);
  }

  const raw = window.localStorage.getItem(keyForWedding(weddingId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as BuilderRevision[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeRaw(weddingId: string, revisions: BuilderRevision[]) {
  const normalized = revisions.slice(0, MAX_REVISIONS);
  if (!hasUsableLocalStorage()) {
    memoryStore.set(weddingId, clone(normalized));
    return;
  }
  window.localStorage.setItem(keyForWedding(weddingId), JSON.stringify(normalized));
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
