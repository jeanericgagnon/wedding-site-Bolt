import { supabase } from './supabase';
import { getStoredActiveSiteId } from './activeSiteStorage';

export type ActiveSiteSummary = {
  id: string;
  role: 'owner' | 'planner' | 'coordinator' | 'viewer';
};

export async function resolveActiveSiteForUser(userId: string): Promise<ActiveSiteSummary | null> {
  const preferredSiteId = getStoredActiveSiteId();

  if (preferredSiteId) {
    const { data: preferredOwnedSite, error: preferredOwnedError } = await supabase
      .from('wedding_sites')
      .select('id')
      .eq('id', preferredSiteId)
      .eq('user_id', userId)
      .maybeSingle();

    if (preferredOwnedError) throw preferredOwnedError;
    if (preferredOwnedSite?.id) {
      return {
        id: preferredOwnedSite.id,
        role: 'owner',
      };
    }

    const { data: preferredCollaboratorSite, error: preferredCollaboratorError } = await supabase
      .from('wedding_site_collaborators')
      .select('wedding_site_id, role')
      .eq('wedding_site_id', preferredSiteId)
      .eq('user_id', userId)
      .maybeSingle();

    if (preferredCollaboratorError) throw preferredCollaboratorError;
    if (preferredCollaboratorSite?.wedding_site_id) {
      return {
        id: preferredCollaboratorSite.wedding_site_id,
        role: (preferredCollaboratorSite.role as ActiveSiteSummary['role']) || 'viewer',
      };
    }
  }

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

export async function resolveActiveSiteRoleForUser(userId: string): Promise<ActiveSiteSummary['role'] | null> {
  const activeSite = await resolveActiveSiteForUser(userId);
  return activeSite?.role || null;
}
