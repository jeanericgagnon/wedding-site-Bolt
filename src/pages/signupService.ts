import { supabase } from '../lib/supabase';

export function makeSignupBaseSlug(email: string): string {
  const local = (email.split('@')[0] || 'ourwedding').toLowerCase();
  const cleaned = local.replace(/[^a-z0-9]/g, '').slice(0, 20);
  return cleaned || 'ourwedding';
}

export async function startSignupWithGoogle(redirectTo: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });

  if (error) throw error;
}

export async function createSignupAccount(email: string, password: string): Promise<string> {
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) throw signUpError;

  let userId = authData.user?.id;

  if (!userId) {
    const signInRes = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInRes.error) {
      const message = signInRes.error.message.toLowerCase();
      if (message.includes('email not confirmed') || message.includes('email_not_confirmed')) {
        throw new Error('Account created! Check your email to confirm your address, then sign in.');
      }
      throw signInRes.error;
    }

    userId = signInRes.data.user?.id;
  }

  if (!userId) {
    throw new Error('Account created! Please sign in to continue.');
  }

  return userId;
}

export async function ensureMinimalWeddingSite(userId: string, email: string): Promise<void> {
  const existing = await supabase
    .from('wedding_sites')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing.data?.id) return;

  const base = makeSignupBaseSlug(email);

  for (let i = 0; i < 6; i += 1) {
    const suffix = i === 0 ? '' : `-${Math.floor(1000 + Math.random() * 9000)}`;
    const siteSlug = `${base}${suffix}`;
    const siteUrl = `${siteSlug}.dayof.love`;

    const { error } = await supabase.rpc('wedding_site_bootstrap_write', {
      p_user_id: userId,
      p_payload: {
        couple_name_1: 'You',
        couple_name_2: 'Partner',
        site_slug: siteSlug,
        site_url: siteUrl,
      },
    });

    if (!error) return;

    const collision = /duplicate key|already exists|unique/i.test(error.message || '');
    if (!collision) throw error;
  }

  throw new Error('Couldn’t reserve a website URL right now. Please try again.');
}
