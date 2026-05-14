import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Palette,
  Users,
  Image,
  Camera,
  Gift,
  Settings,
  Menu,
  X,
  Mail,
  Calendar,
  ExternalLink,
  ClipboardList,
  Armchair,
  Radio,
  ScrollText,
  ChevronDown,
  ChevronRight,
  Globe,
  Archive,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { BillingModal } from '../billing/BillingModal';
import { supabase } from '../../lib/supabase';
import { resolvePublicSiteSlugFromRow } from '../../lib/publicSiteSlug';
import { getSiteVisibilityState } from '../../lib/siteVisibilityState';
import { resolveActiveSiteForUser, resolveActiveSiteRoleForUser } from '../../lib/activeSite';
import { getStoredActiveSiteId, setStoredActiveSiteId } from '../../lib/activeSiteStorage';
import { buildSiteMembershipLabel } from './siteMembershipLabel';
import { hasPlannerPermission, type PlannerPermissionKey } from '../../lib/plannerAccess';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPage: string;
}

type SiteMembershipOption = {
  id: string;
  label: string;
  slug: string | null;
  role: string;
};

type DashboardRole = 'owner' | 'planner' | 'coordinator' | 'viewer';

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, currentPage }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [siteSlug, setSiteSlug] = useState<string | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [siteJsonState, setSiteJsonState] = useState<Record<string, unknown> | null>(null);
  const [siteIsPublished, setSiteIsPublished] = useState(false);
  const [sitePrivacyMode, setSitePrivacyMode] = useState<'public' | 'password_protected' | 'invite_only'>('public');
  const [showMoreFeatures, setShowMoreFeatures] = useState(false);
  const [siteMemberships, setSiteMemberships] = useState<SiteMembershipOption[]>([]);
  const [activeSiteRole, setActiveSiteRole] = useState<DashboardRole | null>(null);
  const [activeSitePermissions, setActiveSitePermissions] = useState<PlannerPermissionKey[] | null>(null);
  const { user, isDemoMode } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    if (isDemoMode) {
      setSiteSlug('alex-jordan-demo');
      setActiveSiteRole('owner');
      setActiveSitePermissions(null);
      return;
    }

    const loadSiteContext = async () => {
      const persistedSiteId = getStoredActiveSiteId();
      const resolvedActiveSite = await resolveActiveSiteForUser(user.id);
      const resolvedRole = await resolveActiveSiteRoleForUser(user.id);
      setActiveSiteRole(resolvedRole);
      setActiveSitePermissions(resolvedActiveSite?.permissions ?? null);
      const preferredSiteId = persistedSiteId || resolvedActiveSite?.id || null;

      const { data: ownedSites } = await supabase
        .from('wedding_sites')
        .select('id, site_slug, couple_name_1, couple_name_2')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      const ownerMemberships: SiteMembershipOption[] = (ownedSites || []).map((site) => ({
        id: site.id,
        label: buildSiteMembershipLabel(site.couple_name_1, site.couple_name_2, site.site_slug),
        slug: site.site_slug,
        role: 'owner',
      }));

      const { data: collaboratorMembershipsRaw } = await supabase
        .from('wedding_site_collaborators')
        .select('wedding_site_id, role, permissions, wedding_sites!inner(id, site_slug, couple_name_1, couple_name_2)')
        .eq('user_id', user.id);

      const collaboratorMemberships: SiteMembershipOption[] = ((collaboratorMembershipsRaw as Array<{
        wedding_site_id: string;
        role: string;
        permissions?: unknown;
        wedding_sites: { id: string; site_slug: string | null; couple_name_1: string | null; couple_name_2: string | null };
      }> | null) || []).map((row) => ({
        id: row.wedding_site_id,
        label: buildSiteMembershipLabel(
          row.wedding_sites?.couple_name_1,
          row.wedding_sites?.couple_name_2,
          row.wedding_sites?.site_slug,
        ),
        slug: row.wedding_sites?.site_slug || null,
        role: row.role,
      }));

      const mergedMemberships = [...ownerMemberships, ...collaboratorMemberships.filter((candidate) => !ownerMemberships.some((ownerSite) => ownerSite.id === candidate.id))];
      setSiteMemberships(mergedMemberships);

      const targetSiteId = preferredSiteId && mergedMemberships.some((site) => site.id === preferredSiteId)
        ? preferredSiteId
        : mergedMemberships[0]?.id || null;

      if (targetSiteId) {
        setStoredActiveSiteId(targetSiteId);
      }

      if (!targetSiteId) return;

      const { data } = await supabase
        .from('wedding_sites')
        .select('id, site_slug, site_url, site_json, is_published')
        .eq('id', targetSiteId)
        .maybeSingle();

      const row = (data as Record<string, unknown> | null) ?? null;
      const resolved = resolvePublicSiteSlugFromRow(row);
      if (resolved) setSiteSlug(resolved);
      if (row?.id && typeof row.id === 'string') setSiteId(row.id);
      setSiteIsPublished(row?.is_published === true);

      const siteJson = row?.site_json;
      if (siteJson && typeof siteJson === 'object' && !Array.isArray(siteJson)) {
        const parsedSiteJson = siteJson as Record<string, unknown>;
        setSiteJsonState(parsedSiteJson);
        const dashboard = parsedSiteJson.dashboard;
        if (dashboard && typeof dashboard === 'object' && !Array.isArray(dashboard)) {
          // legacy sidebar feature state ignored after nav rollup
        }
      }
    };

    void loadSiteContext();
  }, [user, isDemoMode]);

  const getUserInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const navSections: Array<{
    title?: string;
    items: Array<{ id: string; label: string; icon: LucideIcon; path: string }>;
  }> = [
    {
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/dashboard/overview' },
      ],
    },
    {
      title: 'Pinned',
      items: [
        { id: 'builder', label: 'Website', icon: Globe, path: '/dashboard/builder' },
        { id: 'guests', label: 'Guests', icon: Users, path: '/dashboard/guests' },
        { id: 'itinerary', label: 'Schedule', icon: Calendar, path: '/dashboard/itinerary' },
        { id: 'photos', label: 'Memories', icon: Archive, path: '/dashboard/photos' },
      ],
    },
    {
      title: 'More',
      items: [
        { id: 'planning', label: 'Planning', icon: ClipboardList, path: '/dashboard/planning' },
        { id: 'messages', label: 'Messages', icon: Mail, path: '/dashboard/messages' },
        { id: 'registry', label: 'Registry', icon: Gift, path: '/dashboard/registry' },
        { id: 'vendor-templates', label: 'Vendor pages', icon: Palette, path: '/vendor-templates' },
        { id: 'seating', label: 'Seating', icon: Armchair, path: '/dashboard/seating' },
        { id: 'coordinator', label: 'Day-of', icon: Radio, path: '/dashboard/coordinator' },
        { id: 'vault', label: 'Vault', icon: Image, path: '/dashboard/vault' },
        { id: 'audit-logs', label: 'Activity', icon: ScrollText, path: '/dashboard/audit-logs' },
        { id: 'settings', label: 'Settings', icon: Settings, path: '/dashboard/settings' },
      ],
    },
  ];

  const role = activeSiteRole ?? 'owner';
  const canSeeNavItem = (itemId: string) => {
    if (role === 'owner') return true;
    if (itemId === 'overview') return true;
    if (itemId === 'guests') return hasPlannerPermission(role, activeSitePermissions, 'guests');
    if (itemId === 'messages') return hasPlannerPermission(role, activeSitePermissions, 'messages');
    if (itemId === 'planning') return hasPlannerPermission(role, activeSitePermissions, 'planning')
      || hasPlannerPermission(role, activeSitePermissions, 'budget')
      || hasPlannerPermission(role, activeSitePermissions, 'vendors');
    if (itemId === 'vendor-templates') return hasPlannerPermission(role, activeSitePermissions, 'planning')
      || hasPlannerPermission(role, activeSitePermissions, 'vendors');
    if (itemId === 'itinerary') return hasPlannerPermission(role, activeSitePermissions, 'timeline');
    if (itemId === 'seating') return hasPlannerPermission(role, activeSitePermissions, 'seating');
    if (itemId === 'coordinator') return hasPlannerPermission(role, activeSitePermissions, 'coordinator');
    if (itemId === 'registry') return hasPlannerPermission(role, activeSitePermissions, 'registry');
    if (itemId === 'photos' || itemId === 'vault') return hasPlannerPermission(role, activeSitePermissions, 'photos');
    if (itemId === 'settings') return hasPlannerPermission(role, activeSitePermissions, 'settings');
    return false;
  };

  const visibleNavSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canSeeNavItem(item.id)),
    }))
    .filter((section) => section.items.length > 0);

  useEffect(() => {
    if (!activeSiteRole) return;
    const canAccessCurrentPage = visibleNavSections.some((section) => section.items.some((item) => item.id === currentPage));
    if (!canAccessCurrentPage) {
      navigate('/dashboard/overview', { replace: true });
    }
  }, [activeSiteRole, activeSitePermissions, currentPage, navigate, visibleNavSections]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [currentPage]);

  const handleSiteSwitch = (nextSiteId: string) => {
    setStoredActiveSiteId(nextSiteId);
    window.location.reload();
  };

  const siteVisibility = useMemo(() => getSiteVisibilityState({ isPublished: siteIsPublished, privacyMode: sitePrivacyMode, hideFromSearch: siteJsonState?.hide_from_search === true }), [siteIsPublished, sitePrivacyMode, siteJsonState]);
  const currentNavLabel = visibleNavSections.flatMap((section) => section.items).find((item) => item.id === currentPage)?.label || 'Dashboard';
  const pageSubtitles: Record<string, string> = {
    overview: 'The next helpful thing, without the noise.',
    builder: 'Shape the site guests will actually use.',
    guests: 'Names, replies, households, and gentle follow-ups.',
    itinerary: 'The rhythm of the day in one place.',
    messages: 'Updates guests can understand at a glance.',
    photos: 'Guest memories, recaps, and keepsakes.',
    planning: 'The practical pieces behind the celebration.',
    registry: 'Gifts and funds without making it feel salesy.',
    seating: 'Tables, people, and venue-ready assignments.',
    coordinator: 'A quiet day-of view for the people helping.',
    vault: 'Private notes and memories for later.',
    settings: 'Controls for access, language, and sharing.',
    'audit-logs': 'A private record of important changes.',
  };

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-56 bg-background border-r border-border-subtle
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-5">
            <span className="text-2xl font-serif font-normal text-text-primary">dayof</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-surface-subtle rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 px-3 pb-4 overflow-y-auto" aria-label="Dashboard navigation">
            <div className="mb-4 rounded-lg bg-white px-4 py-3 ring-1 ring-border-subtle">
              <p className="text-[11px] font-medium text-text-tertiary">Your site</p>
              <p className="mt-1 text-sm font-medium text-text-primary">{siteVisibility.label}</p>
              {siteSlug && <p className="mt-1 truncate text-xs text-text-secondary">{siteSlug}.dayof.love</p>}
            </div>

            {siteMemberships.length > 1 && (
              <div className="mb-4 rounded-lg bg-white px-4 py-3 ring-1 ring-border-subtle">
                <p className="text-[11px] font-medium text-text-tertiary">Switch wedding</p>
                <select
                  value={siteId || ''}
                  onChange={(e) => handleSiteSwitch(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm text-text-primary"
                >
                  {siteMemberships.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.label} — {site.role}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-5">
              {visibleNavSections.map((section, sectionIndex) => (
                <div key={section.title || `section-${sectionIndex}`}>
                  {section.title && (
                    <button
                      type="button"
                      onClick={() => section.title === 'More' && setShowMoreFeatures((prev) => !prev)}
                      className={`mb-1 flex w-full items-center justify-between px-4 py-2 text-xs font-medium ${section.title === 'More' ? 'text-text-secondary hover:text-text-primary' : 'text-text-tertiary'}`}
                    >
                      <span>{section.title}</span>
                      {section.title === 'More' ? (showMoreFeatures ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />) : null}
                    </button>
                  )}

                  {(section.title !== 'More' || showMoreFeatures) && (
                    <ul className="space-y-1">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentPage === item.id;
                        return (
                          <li key={item.id}>
                            <Link
                              to={item.path}
                              className={`
                                flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm
                                transition-colors no-underline min-h-[44px]
                                ${isActive
                                  ? 'bg-primary/10 text-text-primary'
                                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle/75'
                                }
                              `}
                              onClick={() => setSidebarOpen(false)}
                            >
                              <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                              <span>{item.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </nav>

          <div className="p-3">
            <div className="flex items-center gap-3 rounded-lg bg-white px-3 py-3 ring-1 ring-border-subtle">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-text-primary">
                {getUserInitials()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{user?.name || user?.email || 'Signed in'}</p>
                <p className="text-xs text-text-secondary truncate">{user?.email || 'dayof.love'}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 max-w-full overflow-x-hidden">
        <header className="sticky top-0 z-30 border-b border-border-subtle bg-white">
          <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex items-center justify-center rounded-lg border border-border-subtle p-2 text-text-secondary hover:text-text-primary hover:bg-surface-subtle lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base font-semibold text-text-primary">{currentNavLabel}</h1>
                <p className="hidden text-sm text-text-secondary sm:block">{pageSubtitles[currentPage] ?? 'Everything for the day in one calm place.'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {siteSlug && (
                <a
                  href={`/site/${siteSlug}`}
                  target="_blank"
                  rel="noopener"
                  className="hidden items-center gap-2 rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface-subtle sm:inline-flex"
                >
                  <ExternalLink className="w-4 h-4" />
                  View site
                </a>
              )}
              {activeSiteRole === 'owner' && (
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
                >
                  Plan options
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>

      {showUpgradeModal && <BillingModal onClose={() => setShowUpgradeModal(false)} />}
    </div>
  );
};
