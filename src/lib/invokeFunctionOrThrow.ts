import type { SupabaseClient } from '@supabase/supabase-js';
import { isInternalCustomerErrorMessage } from './customerSafeError';

type FunctionErrorShape = {
  message?: string;
  context?: Response;
};

const FUNCTION_REQUEST_FAILED_COPY = 'Request failed. Please try again.';
const SAFE_FUNCTION_ERROR_CODE = /^[A-Z0-9_-]{2,64}$/;
const INTERNAL_FUNCTION_ERROR_CODE = /\b(DB|DATABASE|SQL|SUPABASE|POSTGRES|POSTGREST|AUTH|BEARER|COOKIE|JWT|PASSCODE|SESSION|TOKEN|SECRET|POLICY|RLS|STORAGE|BUCKET|STRIPE|OPENAI|PROVIDER|KEY)\b/i;
const INTERNAL_FUNCTION_ERROR_TEXT = /\b(functions?http|non-2xx|edge\s*function|http\s*error|doctype|html|auth|bearer|cookie|passcode|session)\b/i;

function safeFunctionErrorText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const message = value.replace(/\s+/g, ' ').trim();
  if (!message) return null;
  if (message.length > 240) return null;
  if (/[<>]/.test(message)) return null;
  if (INTERNAL_FUNCTION_ERROR_TEXT.test(message)) return null;
  if (isInternalCustomerErrorMessage(message)) return null;
  return message;
}

function safeFunctionErrorCode(value: unknown): string {
  if (typeof value !== 'string') return '';
  const code = value.trim();
  if (!SAFE_FUNCTION_ERROR_CODE.test(code)) return '';
  if (INTERNAL_FUNCTION_ERROR_CODE.test(code)) return '';
  if (isInternalCustomerErrorMessage(code)) return '';
  return ` (${code})`;
}

export async function invokeFunctionOrThrow(
  supabase: SupabaseClient,
  fnName: string,
  body: Record<string, unknown>
) {
  const parseError = async (error: FunctionErrorShape, data: unknown) => {
    let msg = FUNCTION_REQUEST_FAILED_COPY;
    let code = '';

    const ctx = error.context;
    if (ctx) {
      try {
        const payload = (await ctx.clone().json()) as { error?: string; code?: string; message?: string };
        msg = safeFunctionErrorText(payload.error) ?? safeFunctionErrorText(payload.message) ?? msg;
        code = safeFunctionErrorCode(payload.code);
      } catch {
        msg = FUNCTION_REQUEST_FAILED_COPY;
      }
    } else {
      const maybe = data as { error?: string; code?: string; message?: string } | null;
      msg = safeFunctionErrorText(maybe?.error) ?? safeFunctionErrorText(maybe?.message) ?? safeFunctionErrorText(error.message) ?? msg;
      code = safeFunctionErrorCode(maybe?.code);
    }

    return `${msg}${code}`;
  };

  const invokeWithToken = async (token: string) => {
    return supabase.functions.invoke(fnName, {
      body,
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const { data: sessionData } = await supabase.auth.getSession();
  let token = sessionData.session?.access_token;
  const expMs = (sessionData.session?.expires_at ?? 0) * 1000;

  if (!token || (expMs > 0 && expMs < Date.now() + 60_000)) {
    const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
    if (refreshErr || !refreshed.session?.access_token) {
      throw new Error('You are not authenticated. Please log out and log back in, then try again. (AUTH_REFRESH_FAILED)');
    }
    token = refreshed.session.access_token;
  }

  let { data, error } = await invokeWithToken(token);

  if (error && /invalid jwt|jwt/i.test(error.message || '')) {
    const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
    if (!refreshErr && refreshed.session?.access_token) {
      ({ data, error } = await invokeWithToken(refreshed.session.access_token));
    }
  }

  if (error) {
    throw new Error(await parseError(error as FunctionErrorShape, data));
  }

  return data;
}
