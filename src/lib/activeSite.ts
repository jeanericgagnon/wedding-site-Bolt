import { supabase } from './supabase';

export type ActiveSiteSummary = {
  id: string;
  role: 'owner' | 'planner' | 'coordinator' | 'viewer';
};

export async function resolveActiveSiteForUser(userId: string): Promise<ActiveSiteSummary | null> {
  const { data: ownedSite, error: ownedError } = await supabase
    .from('wedding_sites')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (ownedError) throw ownedError;
  if (ownedSite?.id) {
    return {
      id: ownedSite.id,
      role: 'owner',
    };
  }

  const { data: collaboratorSite, error: collaboratorError } = await supabase
    .from('wedding_site_collaborators')
    .select('wedding_site_id, role')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (collaboratorError) throw collaboratorError;
  if (!collaboratorSite?.wedding_site_id) return null;

  return {
    id: collaboratorSite.wedding_site_id,
    role: (collaboratorSite.role as ActiveSiteSummary['role']) || 'viewer',
  };
}
