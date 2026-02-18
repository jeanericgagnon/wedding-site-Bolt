import { supabase } from './supabase';

export class SessionExpiredError extends Error {
  constructor() {
    super('Your session expired. Please sign in again.');
    this.name = 'SessionExpiredError';
  }
}

export async function requireSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    throw new SessionExpiredError();
  }
  return session;
}

export async function createCheckoutSession(
  weddingSiteId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const session = await requireSession();

  const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
    body: { wedding_site_id: weddingSiteId, success_url: successUrl, cancel_url: cancelUrl },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    const anyError = error as { message?: string; status?: number; context?: { status?: number; responseText?: string } };
    const status = anyError.status ?? anyError.context?.status ?? 0;
    if (status === 401) {
      throw new SessionExpiredError();
    }
    let msg = anyError.message ?? '';
    if (!msg && anyError.context?.responseText) {
      try {
        const parsed = JSON.parse(anyError.context.responseText);
        msg = parsed.error ?? parsed.message ?? '';
      } catch {
        msg = anyError.context.responseText;
      }
    }
    throw new Error(msg || 'Could not start checkout. Please try again.');
  }

  if (data && (data as { error?: string }).error) {
    const serverMsg = (data as { error: string }).error;
    if (serverMsg.toLowerCase().includes('unauthorized')) {
      throw new SessionExpiredError();
    }
    throw new Error(serverMsg);
  }

  if (!data?.url) {
    throw new Error('No checkout URL returned. Please try again.');
  }

  return data.url as string;
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
