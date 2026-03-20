import { supabase } from './supabase';

type LogPayload = {
  source: string;
  severity?: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  weddingSiteId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
};

const recentFingerprints = new Map<string, number>();
const DEDUPE_WINDOW_MS = 30_000;

function fingerprintFor(payload: LogPayload, route: string) {
  return `${payload.source}|${route}|${payload.message.slice(0, 180)}`;
}

let clientErrorLoggingDisabled = false;

export function logClientError(payload: LogPayload) {
  try {
    const route = typeof window !== 'undefined' ? window.location.pathname : '/';
    if (!route.startsWith('/dashboard')) return;
    if (clientErrorLoggingDisabled) return;

    const fp = fingerprintFor(payload, route);
    const now = Date.now();
    const last = recentFingerprints.get(fp) ?? 0;
    if (now - last < DEDUPE_WINDOW_MS) return;
    recentFingerprints.set(fp, now);

    void supabase.functions.invoke('log-client-error', {
      body: {
        source: payload.source,
        severity: payload.severity ?? 'error',
        route,
        message: payload.message,
        stack: payload.stack,
        weddingSiteId: payload.weddingSiteId,
        userId: payload.userId,
        metadata: payload.metadata ?? {},
      },
    }).then(({ error }) => {
      const msg = (error?.message || '').toLowerCase();
      if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('jwt')) {
        clientErrorLoggingDisabled = true;
      }
    }).catch(() => {
      // swallow logging errors
    });
  } catch {
    // swallow logging errors
  }
}
