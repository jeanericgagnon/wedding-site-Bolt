import { supabase } from './supabase';

async function getFunctionErrorMessage(error: any, fallback: string): Promise<string> {
  const base = error?.message || '';
  const ctx = error?.context;

  if (ctx) {
    try {
      const clone = typeof ctx.clone === 'function' ? ctx.clone() : ctx;
      const text = typeof clone.text === 'function' ? await clone.text() : '';
      if (text) {
        try {
          const parsed = JSON.parse(text);
          if (parsed?.error) return String(parsed.error);
        } catch {
          // not json
        }
        return text;
      }
    } catch {
      // ignore context parsing errors
    }
  }

  return base || fallback;
}

export class SessionExpiredError extends Error {
  constructor() {
    super('Your session expired. Please sign in again.');
    this.name = 'SessionExpiredError';
  }
}

export async function requireSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (!error && session?.access_token) {
    return session;
  }
  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !refreshed.session?.access_token) {
    throw new SessionExpiredError();
  }
  return refreshed.session;
}

export async function createCheckoutSession(
  weddingSiteId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  let session = await requireSession();

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string).trim();
  const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string).trim();

  const call = async (token: string) => {
    const res = await fetch(`${supabaseUrl}/functions/v1/stripe-create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        wedding_site_id: weddingSiteId,
        success_url: successUrl,
        cancel_url: cancelUrl,
      }),
    });

    const raw = await res.text();
    let json: { url?: string; error?: string } = {};
    try {
      json = raw ? JSON.parse(raw) : {};
    } catch {
      // non-json response
    }

    return { res, json, raw };
  };

  let out = await call(session.access_token);

  if (out.res.status === 401) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshed.session?.access_token) {
      session = refreshed.session;
      out = await call(session.access_token);
    }
  }

  if (!out.res.ok) {
    if (out.res.status === 401) throw new SessionExpiredError();
    throw new Error(out.json.error || out.raw || `Server error (${out.res.status})`);
  }

  if (out.json.error) throw new Error(out.json.error);
  if (!out.json.url) throw new Error('No checkout URL returned. Please try again.');

  return out.json.url;
}

export async function createSubscriptionSession(
  weddingSiteId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const session = await requireSession();

  let { data, error } = await supabase.functions.invoke('stripe-create-subscription', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: {
      wedding_site_id: weddingSiteId,
      success_url: successUrl,
      cancel_url: cancelUrl,
    },
  });

  if (error && /401|unauthorized|jwt|token|expired/i.test((error as any)?.message || '')) {
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError) {
      const { data: { session: refreshedSession } } = await supabase.auth.getSession();
      const retry = await supabase.functions.invoke('stripe-create-subscription', {
        headers: refreshedSession?.access_token
          ? { Authorization: `Bearer ${refreshedSession.access_token}` }
          : undefined,
        body: {
          wedding_site_id: weddingSiteId,
          success_url: successUrl,
          cancel_url: cancelUrl,
        },
      });
      data = retry.data;
      error = retry.error;
    }
  }

  if (error) {
    const message = await getFunctionErrorMessage(error, 'Could not start subscription checkout. Please try again.');
    if (/401|unauthorized|jwt|token|expired/i.test(message)) {
      throw new SessionExpiredError();
    }
    throw new Error(message);
  }

  const json = (data ?? {}) as { url?: string; error?: string };
  if (json.error) throw new Error(json.error);
  if (!json.url) throw new Error('No subscription checkout URL returned. Please try again.');

  return json.url;
}

export type BillingInfo = {
  payment_status: 'payment_required' | 'active' | 'canceled';
  billing_type: 'one_time' | 'recurring';
  site_expires_at: string | null;
  paid_at: string | null;
  stripe_subscription_id: string | null;
  wedding_site_id: string;
};

export async function fetchBillingInfo(userId: string): Promise<BillingInfo | null> {
  const { data, error } = await supabase
    .from('wedding_sites')
    .select('id, payment_status, billing_type, site_expires_at, paid_at, stripe_subscription_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    wedding_site_id: data.id,
    payment_status: data.payment_status,
    billing_type: data.billing_type,
    site_expires_at: data.site_expires_at,
    paid_at: data.paid_at,
    stripe_subscription_id: data.stripe_subscription_id,
  };
}

export async function fetchPaymentStatus(userId: string): Promise<'payment_required' | 'active' | 'canceled' | null> {
  const { data, error } = await supabase
    .from('wedding_sites')
    .select('id, payment_status')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return data.payment_status as 'payment_required' | 'active' | 'canceled';
}

export async function fetchWeddingSiteId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('wedding_sites')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

export function isSiteExpired(siteExpiresAt: string | null): boolean {
  if (!siteExpiresAt) return false;
  return new Date(siteExpiresAt) < new Date();
}

export function daysUntilExpiry(siteExpiresAt: string | null): number | null {
  if (!siteExpiresAt) return null;
  const ms = new Date(siteExpiresAt).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export async function createSmsCreditsSession(
  weddingSiteId: string,
  successUrl: string,
  cancelUrl: string,
  pack: 'sms_100' | 'sms_500' | 'sms_1000'
): Promise<string> {
  const session = await requireSession();

  let { data, error } = await supabase.functions.invoke('stripe-create-sms-credits', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: {
      wedding_site_id: weddingSiteId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      pack,
    },
  });

  if (error && /401|unauthorized|jwt|token|expired/i.test((error as any)?.message || '')) {
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError) {
      const { data: { session: refreshedSession } } = await supabase.auth.getSession();
      const retry = await supabase.functions.invoke('stripe-create-sms-credits', {
        headers: refreshedSession?.access_token
          ? { Authorization: `Bearer ${refreshedSession.access_token}` }
          : undefined,
        body: {
          wedding_site_id: weddingSiteId,
          success_url: successUrl,
          cancel_url: cancelUrl,
          pack,
        },
      });
      data = retry.data;
      error = retry.error;
    }
  }

  if (error) {
    const message = await getFunctionErrorMessage(error, 'Could not start SMS credits checkout. Please try again.');
    if (/401|unauthorized|jwt|token|expired/i.test(message)) {
      throw new SessionExpiredError();
    }
    throw new Error(message);
  }

  const json = (data ?? {}) as { url?: string; error?: string };
  if (json.error) throw new Error(json.error);
  if (!json.url) throw new Error('No checkout URL returned. Please try again.');

  return json.url;
}
