import { supabase } from './supabase';
import { getStoredActiveSiteId } from './activeSiteStorage';
import { isPlannerCollaboratorRole, normalizePlannerPermissions, type PlannerPermissionKey } from './plannerAccess';
import { DEMO_MODE } from '../config/env';

export type ActiveSiteSummary = {
  id: string;
  role: 'owner' | 'planner' | 'coordinator' | 'viewer';
  permissions: PlannerPermissionKey[] | null;
};

export const MAX_ACTIVE_SITE_OWNED_LOOKUP_ROWS = 1;
export const MAX_ACTIVE_SITE_COLLABORATOR_LOOKUP_ROWS = 1;

export async function resolveActiveSiteForUser(userId: string): Promise<ActiveSiteSummary | null> {
  if (DEMO_MODE && userId === 'demo-local-user') {
    return {
      id: 'demo-site-id',
      role: 'owner',
      permissions: null,
    };
  }

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
        permissions: null,
      };
    }

    const { data: preferredCollaboratorSite, error: preferredCollaboratorError } = await supabase
      .from('wedding_site_collaborators')
      .select('wedding_site_id, role, permissions')
      .eq('wedding_site_id', preferredSiteId)
      .eq('user_id', userId)
      .maybeSingle();

    if (preferredCollaboratorError) throw preferredCollaboratorError;
    if (preferredCollaboratorSite?.wedding_site_id) {
      return {
        id: preferredCollaboratorSite.wedding_site_id,
        role: isPlannerCollaboratorRole(preferredCollaboratorSite.role) ? preferredCollaboratorSite.role : 'viewer',
        permissions: normalizePlannerPermissions(preferredCollaboratorSite.permissions),
      };
    }
  }

  const { data: ownedSite, error: ownedError } = await supabase
    .from('wedding_sites')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(MAX_ACTIVE_SITE_OWNED_LOOKUP_ROWS)
    .maybeSingle();

  if (ownedError) throw ownedError;
  if (ownedSite?.id) {
    return {
      id: ownedSite.id,
      role: 'owner',
      permissions: null,
    };
  }

  const { data: collaboratorSite, error: collaboratorError } = await supabase
    .from('wedding_site_collaborators')
    .select('wedding_site_id, role, permissions')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(MAX_ACTIVE_SITE_COLLABORATOR_LOOKUP_ROWS)
    .maybeSingle();

  if (collaboratorError) throw collaboratorError;
  if (!collaboratorSite?.wedding_site_id) return null;

  return {
    id: collaboratorSite.wedding_site_id,
    role: isPlannerCollaboratorRole(collaboratorSite.role) ? collaboratorSite.role : 'viewer',
    permissions: normalizePlannerPermissions(collaboratorSite.permissions),
  };
}

export async function resolveActiveSiteRoleForUser(userId: string): Promise<ActiveSiteSummary['role'] | null> {
  const activeSite = await resolveActiveSiteForUser(userId);
  return activeSite?.role || null;
}
