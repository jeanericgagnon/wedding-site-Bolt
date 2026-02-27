import type { SupabaseClient } from '@supabase/supabase-js';

type FunctionErrorShape = {
  message?: string;
  context?: Response;
};

export async function invokeFunctionOrThrow(
  supabase: SupabaseClient,
  fnName: string,
  body: Record<string, unknown>
) {
  const parseError = async (error: FunctionErrorShape, data: unknown) => {
    let msg = error.message || 'Request failed';
    let code = '';

    const ctx = error.context;
    if (ctx) {
      try {
        const payload = (await ctx.clone().json()) as { error?: string; code?: string; message?: string };
        msg = payload.error || payload.message || msg;
        if (payload.code) code = ` (${payload.code})`;
      } catch {
        try {
          const text = await ctx.clone().text();
          if (text) msg = text;
        } catch {
          // ignore
        }
      }
    } else {
      const maybe = data as { error?: string; code?: string; message?: string } | null;
      msg = maybe?.error || maybe?.message || msg;
      if (maybe?.code) code = ` (${maybe.code})`;
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
