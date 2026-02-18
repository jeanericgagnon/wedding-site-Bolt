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
  await requireSession();

  const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
    body: { wedding_site_id: weddingSiteId, success_url: successUrl, cancel_url: cancelUrl },
  });

  if (error) {
    const msg = (error as { message?: string; context?: { status?: number } }).message ?? '';
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 401 || msg.toLowerCase().includes('unauthorized')) {
      throw new SessionExpiredError();
    }
    throw new Error(msg || 'Could not start checkout. Please try again.');
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
