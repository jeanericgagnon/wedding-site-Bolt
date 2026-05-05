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

export function getCoordinatorStorageKey(siteId: string, key: CoordinatorStorageKey): string {
  if (key === 'timeline' || key === 'alertlog' || key === 'qna') return `dayof.${key}.${siteId}`;
  return `dayof.coordinator.${key}.${siteId}`;
}

function readStoredJson(siteId: string, key: CoordinatorStorageKey): unknown {
  try {
    const raw = localStorage.getItem(getCoordinatorStorageKey(siteId, key));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStoredJson(siteId: string, key: CoordinatorStorageKey, value: unknown): void {
  try {
    localStorage.setItem(getCoordinatorStorageKey(siteId, key), JSON.stringify(value));
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
