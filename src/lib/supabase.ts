import { createClient } from '@supabase/supabase-js';
import { customerSafeErrorMessage } from './customerSafeError';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const SAFE_FUNCTION_DENIAL_COPY = /^(Missing authorization|Unauthorized\.?|Forbidden|Authentication required|Sign in required)$/i;

export function safeFunctionFailureTelemetryMessage(value: unknown, status: number): string {
  return customerSafeErrorMessage(
    typeof value === 'string' ? value : '',
    `Request failed with status ${status}.`,
    { allow: [SAFE_FUNCTION_DENIAL_COPY] }
  );
}

const emitFunctionFailure = async (input: RequestInfo | URL, response: Response) => {
  if (typeof window === 'undefined') return;
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (!url.includes('/functions/v1/') || url.includes('/functions/v1/log-client-error')) return;
  if (response.ok) return;

  const functionName = url.split('/functions/v1/')[1]?.split(/[/?#]/)[0] || 'unknown';
  let code: string | undefined;
  let message = `Request failed with status ${response.status}.`;

  try {
    const payload = await response.clone().json() as { error?: unknown; code?: unknown; message?: unknown };
    if (typeof payload.code === 'string') code = payload.code.slice(0, 80);
    const rawMessage = typeof payload.error === 'string' ? payload.error : typeof payload.message === 'string' ? payload.message : '';
    message = safeFunctionFailureTelemetryMessage(rawMessage, response.status).slice(0, 240);
  } catch {
    // Keep sanitized status-only detail when the response body is not JSON.
  }

  window.dispatchEvent(new CustomEvent('dayof:function-error', {
    detail: {
      functionName,
      status: response.status,
      code,
      message,
    },
  }));
};

const supabaseFetch: typeof fetch = async (input, init) => {
  try {
    const response = await fetch(input, init);
    void emitFunctionFailure(input, response);
    return response;
  } catch {
    const response = new Response(JSON.stringify({
      error: 'Network request failed. Please try again.',
      code: 'network_fetch_failed',
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
    void emitFunctionFailure(input, response);
    return response;
  }
};

export const supabase = createClient(
  supabaseUrl || 'https://missing-supabase-config.supabase.co',
  supabaseAnonKey || 'missing-supabase-anon-key',
  {
    global: {
      fetch: supabaseFetch,
    },
  }
);
