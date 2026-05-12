import { supabase } from './supabase';

export async function isAdminUser(userId: string): Promise<boolean> {
  if (!userId.trim()) return false;

  const { data, error } = await supabase.rpc('admin_access_check');

  if (error) throw error;
  return data === true;
}
