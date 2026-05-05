import { supabase } from './supabase';
import { getStoredActiveSiteId } from './activeSiteStorage';
import type { PlannerPermissionKey } from './plannerAccess';
import { DEMO_MODE } from '../config/env';

export type ActiveSiteSummary = {
  id: string;
  role: 'owner' | 'planner' | 'coordinator' | 'viewer';
  permissions: PlannerPermissionKey[] | null;
};

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
        role: (preferredCollaboratorSite.role as ActiveSiteSummary['role']) || 'viewer',
        permissions: Array.isArray(preferredCollaboratorSite.permissions) ? preferredCollaboratorSite.permissions as PlannerPermissionKey[] : [],
      };
    }
  }

  const { data: ownedSite, error: ownedError } = await supabase
    .from('wedding_sites')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
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
    .limit(1)
    .maybeSingle();

  if (collaboratorError) throw collaboratorError;
  if (!collaboratorSite?.wedding_site_id) return null;

  return {
    id: collaboratorSite.wedding_site_id,
    role: (collaboratorSite.role as ActiveSiteSummary['role']) || 'viewer',
    permissions: Array.isArray(collaboratorSite.permissions) ? collaboratorSite.permissions as PlannerPermissionKey[] : [],
  };
}

export async function resolveActiveSiteRoleForUser(userId: string): Promise<ActiveSiteSummary['role'] | null> {
  const activeSite = await resolveActiveSiteForUser(userId);
  return activeSite?.role || null;
}
