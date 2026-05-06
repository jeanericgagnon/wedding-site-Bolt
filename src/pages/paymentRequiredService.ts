import { supabase } from '../lib/supabase';
import { fetchWeddingSiteId } from '../lib/stripeService';

export function makePaymentRequiredBaseSlug(email?: string | null): string {
  const local = (email?.split('@')[0] || 'ourwedding').toLowerCase();
  const cleaned = local.replace(/[^a-z0-9]/g, '').slice(0, 20);
  return cleaned || 'ourwedding';
}

export async function ensureMinimalPaymentWeddingSite(userId: string, email?: string | null): Promise<string> {
  const existing = await fetchWeddingSiteId(userId);
  if (existing) return existing;

  const base = makePaymentRequiredBaseSlug(email);

  for (let i = 0; i < 6; i += 1) {
    const suffix = i === 0 ? '' : `-${Math.floor(1000 + Math.random() * 9000)}`;
    const siteSlug = `${base}${suffix}`;
    const siteUrl = `${siteSlug}.dayof.love`;

    const { data, error } = await supabase
      .from('wedding_sites')
      .insert({
        user_id: userId,
        couple_name_1: 'You',
        couple_name_2: 'Partner',
        site_slug: siteSlug,
        site_url: siteUrl,
      })
      .select('id')
      .maybeSingle();

    if (!error && data?.id) return data.id;

    const collision = /duplicate key|already exists|unique/i.test(error?.message || '');
    if (!collision) throw error;
  }

  throw new Error('Couldn’t create your website record right now. Please refresh and try again.');
}
