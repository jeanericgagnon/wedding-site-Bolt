import { supabase } from './supabase';

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
  const session = await requireSession();

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  const res = await fetch(`${supabaseUrl}/functions/v1/stripe-create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({
      wedding_site_id: weddingSiteId,
      success_url: successUrl,
      cancel_url: cancelUrl,
    }),
  });

  const json = await res.json().catch(() => ({})) as { url?: string; error?: string };

  if (!res.ok) {
    if (res.status === 401) throw new SessionExpiredError();
    const msg = json.error || `Server error (${res.status})`;
    throw new Error(msg);
  }

  if (json.error) throw new Error(json.error);
  if (!json.url) throw new Error('No checkout URL returned. Please try again.');

  return json.url;
}

export async function createSubscriptionSession(
  weddingSiteId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const session = await requireSession();

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  const res = await fetch(`${supabaseUrl}/functions/v1/stripe-create-subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({
      wedding_site_id: weddingSiteId,
      success_url: successUrl,
      cancel_url: cancelUrl,
    }),
  });

  const json = await res.json().catch(() => ({})) as { url?: string; error?: string };

  if (!res.ok) {
    if (res.status === 401) throw new SessionExpiredError();
    const msg = json.error || `Server error (${res.status})`;
    throw new Error(msg);
  }

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
