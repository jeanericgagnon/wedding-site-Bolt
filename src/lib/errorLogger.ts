import { supabase } from './supabase';
import { customerSafeErrorMessage, isInternalCustomerErrorMessage } from './customerSafeError';

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
const CLIENT_ERROR_LOG_MESSAGE_COPY = 'Client error captured.';
const SENSITIVE_METADATA_KEY = /token|secret|password|passcode|authorization|auth|bearer|apikey|api_key|service_role|service-role|cookie|session|jwt/i;
const SENSITIVE_TEXT_VALUE =
  /([?&#](?:token|invite_token|secureToken|access_token|apikey|api_key|password|passcode|authorization|auth|bearer|cookie|session|jwt|secret)=)[^&#\s]+|(?:Bearer\s+)[A-Za-z0-9._~+/=-]+|(?:token|invite_token|secureToken|access_token|authorization|auth|bearer|apikey|api_key|password|passcode|cookie|session|jwt|secret)\s*[:=]\s*[^\s,;]+/gi;

function fingerprintFor(payload: LogPayload, route: string) {
  return `${payload.source}|${route}|${safeClientErrorMessage(payload.message).slice(0, 180)}`;
}

let clientErrorLoggingDisabled = false;

function safeClientErrorMessage(message: string) {
  return customerSafeErrorMessage(message, CLIENT_ERROR_LOG_MESSAGE_COPY, {
    allow: [
      /^(section|client|runtime|render|dashboard|component|route|unknown|unexpected|validation|not found|missing|required|invalid|unavailable|retry|failed)$/i,
    ],
  });
}

function safeClientErrorStack(stack: string | undefined) {
  if (!stack) return undefined;
  const compact = stack.replace(/\s+/g, ' ').trim().slice(0, 2000);
  if (!compact || isInternalCustomerErrorMessage(compact)) return undefined;
  return compact;
}

function safeClientErrorMetadataValue(value: unknown, depth = 0): unknown {
  if (depth > 3) return '[truncated]';
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') {
    return value.replace(SENSITIVE_TEXT_VALUE, (match, queryPrefix) => (
      typeof queryPrefix === 'string' ? `${queryPrefix}[redacted]` : match.replace(/[^:=\s]+$/i, '[redacted]')
    )).slice(0, 500);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 10).map((item) => safeClientErrorMetadataValue(item, depth + 1));
  }
  if (typeof value !== 'object') return null;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 25)
      .map(([key, item]) => [
        key,
        SENSITIVE_METADATA_KEY.test(key) ? '[redacted]' : safeClientErrorMetadataValue(item, depth + 1),
      ])
  );
}

function safeClientErrorMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!metadata) return {};
  const sanitized = safeClientErrorMetadataValue(metadata);
  return sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized) ? sanitized as Record<string, unknown> : {};
}

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
        message: safeClientErrorMessage(payload.message),
        stack: safeClientErrorStack(payload.stack),
        weddingSiteId: payload.weddingSiteId,
        userId: payload.userId,
        metadata: safeClientErrorMetadata(payload.metadata),
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
