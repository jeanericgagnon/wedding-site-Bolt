import { supabase } from './supabase';

export const ADMIN_USER_SELECT = 'user_id';

export async function isAdminUser(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('admin_users')
    .select(ADMIN_USER_SELECT)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}
