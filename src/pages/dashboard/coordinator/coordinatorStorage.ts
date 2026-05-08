import { normalizeCoordinatorActiveWorkState, type CoordinatorActiveWorkState } from '../../../lib/coordinatorActiveWorkState';
import { normalizeCoordinatorAlertIntentState, type CoordinatorAlertIntentState } from '../../../lib/coordinatorAlertIntent';
import { normalizeCoordinatorCommandState, type CoordinatorCommandState } from '../../../lib/coordinatorCommandState';
import { normalizeCoordinatorDraftState, type CoordinatorDraftState } from '../../../lib/coordinatorDraftState';
import { normalizeCoordinatorGuestWorkState, type CoordinatorGuestWorkState } from '../../../lib/coordinatorGuestWorkState';
import { normalizeCoordinatorModeSessionState, type CoordinatorModeSessionState } from '../../../lib/coordinatorModeSessionState';
import { normalizeCoordinatorAlertLog, normalizeCoordinatorQnaItems, normalizeCoordinatorTimelineState } from '../../../lib/coordinatorModePersistence';
import { normalizeCoordinatorTimelineWorkState, type CoordinatorTimelineWorkState } from '../../../lib/coordinatorTimelineWorkState';
import type { AlertLog, QnaItem, TimelineState } from './coordinatorDashboardTypes';

type CoordinatorStorageKey =
  | 'timeline'
  | 'alertlog'
  | 'qna'
  | 'session'
  | 'draft'
  | 'active'
  | 'guest'
  | 'timelinework'
  | 'command'
  | 'alertintent';

export const COORDINATOR_STORAGE_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

type CoordinatorStorageEnvelope = {
  savedAtISO: string;
  value: unknown;
};

export function getCoordinatorStorageKey(siteId: string, key: CoordinatorStorageKey): string {
  if (key === 'timeline' || key === 'alertlog' || key === 'qna') return `dayof.${key}.${siteId}`;
  return `dayof.coordinator.${key}.${siteId}`;
}

const isFreshCoordinatorStorageTimestamp = (value: unknown, now = Date.now()) => {
  if (typeof value !== 'string') return false;
  const savedAtMs = Date.parse(value);
  return Number.isFinite(savedAtMs) && savedAtMs <= now && now - savedAtMs <= COORDINATOR_STORAGE_RETENTION_MS;
};

const isCoordinatorStorageEnvelope = (value: unknown): value is CoordinatorStorageEnvelope => (
  Boolean(value)
  && typeof value === 'object'
  && !Array.isArray(value)
  && typeof (value as CoordinatorStorageEnvelope).savedAtISO === 'string'
  && 'value' in (value as Record<string, unknown>)
);

function readStoredJson(siteId: string, key: CoordinatorStorageKey): unknown {
  const storageKey = getCoordinatorStorageKey(siteId, key);
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : null;
    if (isCoordinatorStorageEnvelope(parsed)) {
      if (!isFreshCoordinatorStorageTimestamp(parsed.savedAtISO)) {
        localStorage.removeItem(storageKey);
        return null;
      }
      return parsed.value;
    }

    if (parsed !== null) {
      localStorage.setItem(storageKey, JSON.stringify({
        savedAtISO: new Date().toISOString(),
        value: parsed,
      }));
    }
    return parsed;
  } catch {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    return null;
  }
}

function writeStoredJson(siteId: string, key: CoordinatorStorageKey, value: unknown): void {
  try {
    localStorage.setItem(getCoordinatorStorageKey(siteId, key), JSON.stringify({
      savedAtISO: new Date().toISOString(),
      value,
    }));
  } catch {}
}

export function readStoredCoordinatorTimelineState(siteId: string): Record<string, TimelineState> {
  return normalizeCoordinatorTimelineState(readStoredJson(siteId, 'timeline')) as Record<string, TimelineState>;
}

export function writeStoredCoordinatorTimelineState(siteId: string, timelineState: Record<string, TimelineState>): void {
  writeStoredJson(siteId, 'timeline', timelineState);
}

export function readStoredCoordinatorAlertLog(siteId: string): AlertLog[] {
  return normalizeCoordinatorAlertLog(readStoredJson(siteId, 'alertlog')) as AlertLog[];
}

export function writeStoredCoordinatorAlertLog(siteId: string, alertLog: AlertLog[]): void {
  writeStoredJson(siteId, 'alertlog', alertLog);
}

export function readStoredCoordinatorQnaItems(siteId: string): QnaItem[] {
  return (normalizeCoordinatorQnaItems(readStoredJson(siteId, 'qna')) as QnaItem[])
    .filter((item) => item.id.trim().length > 0 && item.question.trim().length > 0);
}

export function writeStoredCoordinatorQnaItems(siteId: string, qnaItems: QnaItem[]): void {
  writeStoredJson(siteId, 'qna', qnaItems);
}

export function readStoredCoordinatorSessionState(siteId: string): CoordinatorModeSessionState {
  return normalizeCoordinatorModeSessionState(readStoredJson(siteId, 'session'));
}

export function writeStoredCoordinatorSessionState(siteId: string, sessionState: CoordinatorModeSessionState): void {
  writeStoredJson(siteId, 'session', sessionState);
}

export function readStoredCoordinatorDraftState(siteId: string): CoordinatorDraftState {
  return normalizeCoordinatorDraftState(readStoredJson(siteId, 'draft'));
}

export function writeStoredCoordinatorDraftState(siteId: string, draftState: CoordinatorDraftState): void {
  writeStoredJson(siteId, 'draft', draftState);
}

export function readStoredCoordinatorActiveWorkState(siteId: string): CoordinatorActiveWorkState {
  return normalizeCoordinatorActiveWorkState(readStoredJson(siteId, 'active'));
}

export function writeStoredCoordinatorActiveWorkState(siteId: string, activeWorkState: CoordinatorActiveWorkState): void {
  writeStoredJson(siteId, 'active', activeWorkState);
}

export function readStoredCoordinatorGuestWorkState(siteId: string): CoordinatorGuestWorkState {
  return normalizeCoordinatorGuestWorkState(readStoredJson(siteId, 'guest'));
}

export function writeStoredCoordinatorGuestWorkState(siteId: string, guestWorkState: CoordinatorGuestWorkState): void {
  writeStoredJson(siteId, 'guest', guestWorkState);
}

export function readStoredCoordinatorTimelineWorkState(siteId: string): CoordinatorTimelineWorkState {
  return normalizeCoordinatorTimelineWorkState(readStoredJson(siteId, 'timelinework'));
}

export function writeStoredCoordinatorTimelineWorkState(siteId: string, timelineWorkState: CoordinatorTimelineWorkState): void {
  writeStoredJson(siteId, 'timelinework', timelineWorkState);
}

export function readStoredCoordinatorCommandState(siteId: string): CoordinatorCommandState {
  return normalizeCoordinatorCommandState(readStoredJson(siteId, 'command'));
}

export function writeStoredCoordinatorCommandState(siteId: string, commandState: CoordinatorCommandState): void {
  writeStoredJson(siteId, 'command', commandState);
}

export function readStoredCoordinatorAlertIntentState(siteId: string): CoordinatorAlertIntentState {
  return normalizeCoordinatorAlertIntentState(readStoredJson(siteId, 'alertintent'));
}

export function writeStoredCoordinatorAlertIntentState(siteId: string, alertIntentState: CoordinatorAlertIntentState): void {
  writeStoredJson(siteId, 'alertintent', alertIntentState);
}
