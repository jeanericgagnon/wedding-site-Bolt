import { supabase } from './supabase';

export async function createCheckoutSession(
  weddingSiteId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  const resp = await fetch(`${supabaseUrl}/functions/v1/stripe-create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      Apikey: anonKey,
    },
    body: JSON.stringify({ wedding_site_id: weddingSiteId, success_url: successUrl, cancel_url: cancelUrl }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `HTTP ${resp.status}`);
  }

  const data = await resp.json() as { url: string };
  return data.url;
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
