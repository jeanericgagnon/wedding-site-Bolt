import { supabase } from './supabase';

export const resolvePrimaryWeddingSiteId = async (userId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('wedding_sites')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.id || null;
};
