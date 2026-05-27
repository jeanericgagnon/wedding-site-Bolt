import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  LayoutDashboard,
  Users,
  Image,
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
import { getDemoDashboardSiteContext } from './dashboardDemoContext';
import { buildSiteMembershipLabel } from './siteMembershipLabel';
import { buildDashboardRoleGuide } from './dashboardRoleGuide';
import { resolveDashboardLayoutSiteContext } from './dashboardSiteContext';

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
  const { user, isDemoMode } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    if (isDemoMode) {
      const demoSiteContext = getDemoDashboardSiteContext();
      setSiteSlug(demoSiteContext.siteSlug);
      setSiteId(demoSiteContext.siteId);
      setSiteIsPublished(demoSiteContext.isPublished);
      setSitePrivacyMode(demoSiteContext.privacyMode);
      setSiteJsonState(demoSiteContext.siteJson);
      setActiveSiteRole(demoSiteContext.role);
      return;
    }

    const loadSiteContext = async () => {
      const persistedSiteId = getStoredActiveSiteId();
      const resolvedActiveSite = await resolveActiveSiteForUser(user.id);
      const resolvedRole = await resolveActiveSiteRoleForUser(user.id);
      setActiveSiteRole(resolvedRole);
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
        .select('wedding_site_id, role, wedding_sites!inner(id, site_slug, couple_name_1, couple_name_2)')
        .eq('user_id', user.id);

      const collaboratorMemberships: SiteMembershipOption[] = ((collaboratorMembershipsRaw as Array<{
        wedding_site_id: string;
        role: string;
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
        .select('id, site_slug, site_url, site_json, is_published, privacy_mode')
        .eq('id', targetSiteId)
        .maybeSingle();

      const row = (data as Record<string, unknown> | null) ?? null;
      const siteContext = resolveDashboardLayoutSiteContext(row);
      const resolved = resolvePublicSiteSlugFromRow(row);
      if (resolved) setSiteSlug(resolved);
      if (siteContext.rowId) setSiteId(siteContext.rowId);
      setSiteIsPublished(siteContext.isPublished);
      setSitePrivacyMode(siteContext.privacyMode);

      if (siteContext.siteJson) {
        setSiteJsonState(siteContext.siteJson);
        const dashboard = siteContext.siteJson.dashboard;
        if (dashboard && typeof dashboard === 'object' && !Array.isArray(dashboard)) {
          // legacy sidebar feature state ignored after nav rollup
        }
      } else {
        setSiteJsonState(null);
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
      title: 'Core',
      items: [
        { id: 'builder', label: 'Website', icon: Globe, path: '/dashboard/builder' },
        { id: 'registry', label: 'Registry', icon: Gift, path: '/dashboard/registry' },
        { id: 'guests', label: 'Guests & RSVP', icon: Users, path: '/dashboard/guests' },
        { id: 'itinerary', label: 'Events & Seating', icon: Calendar, path: '/dashboard/itinerary' },
        { id: 'messages', label: 'Messaging', icon: Mail, path: '/dashboard/messages' },
        { id: 'photos', label: 'Memories', icon: Archive, path: '/dashboard/photos' },
        { id: 'planning', label: 'Planning', icon: ClipboardList, path: '/dashboard/planning' },
        { id: 'settings', label: 'Settings', icon: Settings, path: '/dashboard/settings' },
      ],
    },
    {
      title: 'More',
      items: [
        { id: 'seating', label: 'Seating', icon: Armchair, path: '/dashboard/seating' },
        { id: 'coordinator', label: 'Coordinator Mode', icon: Radio, path: '/dashboard/coordinator' },
        { id: 'vault', label: 'Archive Vaults', icon: Image, path: '/dashboard/vault' },
        { id: 'audit-logs', label: 'Audit Logs', icon: ScrollText, path: '/dashboard/audit-logs' },
      ],
    },
  ];

  const role = activeSiteRole ?? 'owner';
  const canSeeNavItem = (itemId: string) => {
    if (role === 'owner') return true;
    if (role === 'planner') return itemId !== 'builder' && itemId !== 'audit-logs';
    if (role === 'coordinator') return ['overview', 'guests', 'itinerary', 'messages', 'photos', 'planning', 'seating', 'coordinator', 'vault'].includes(itemId);
    return ['overview', 'registry', 'guests', 'itinerary', 'messages', 'photos', 'planning', 'vault'].includes(itemId);
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
  }, [activeSiteRole, currentPage, navigate, visibleNavSections]);

  const handleSiteSwitch = (nextSiteId: string) => {
    setStoredActiveSiteId(nextSiteId);
    window.location.reload();
  };

  const siteVisibility = useMemo(() => getSiteVisibilityState({ isPublished: siteIsPublished, privacyMode: sitePrivacyMode, hideFromSearch: siteJsonState?.hide_from_search === true }), [siteIsPublished, sitePrivacyMode, siteJsonState]);
  const currentNavLabel = visibleNavSections.flatMap((section) => section.items).find((item) => item.id === currentPage)?.label || 'Dashboard';
  const roleGuide = useMemo(() => buildDashboardRoleGuide(role), [role]);

  return (
    <div className="min-h-screen bg-background flex">
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border-subtle
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-accent" aria-hidden="true" />
              <span className="text-xl font-semibold text-text-primary">Dayof</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-surface-subtle rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 p-4 overflow-y-auto" aria-label="Dashboard navigation">
            <div className="mb-4 rounded-xl border border-border-subtle bg-surface-subtle/40 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-text-tertiary">Site visibility</p>
              <p className="mt-1 text-sm font-medium text-text-primary">{siteVisibility.label}</p>
              {siteSlug && <p className="mt-1 text-xs text-text-secondary">{siteSlug}.dayof.love</p>}
              <p className="mt-1 text-[11px] text-text-tertiary">{siteVisibility.searchLabel}</p>
              <p className="mt-1 text-[11px] text-text-tertiary">{siteVisibility.explainer}</p>
            </div>

            <div className="mb-4 rounded-xl border border-border-subtle bg-surface-subtle/40 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-text-tertiary">{roleGuide.label}</p>
              <p className="mt-1 text-sm font-medium text-text-primary">{roleGuide.title}</p>
              <p className="mt-1 text-[11px] leading-5 text-text-tertiary">{roleGuide.detail}</p>
              <div className="mt-3 space-y-2">
                <div className="rounded-lg border border-border-subtle bg-white/80 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-text-tertiary">Main focus</p>
                  <p className="mt-1 text-sm font-medium text-text-primary">{roleGuide.focusTitle}</p>
                  <p className="mt-1 text-[11px] leading-5 text-text-tertiary">{roleGuide.focusDetail}</p>
                </div>
                <div className="rounded-lg border border-border-subtle bg-white/80 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-text-tertiary">Decision rule</p>
                  <p className="mt-1 text-[11px] leading-5 text-text-tertiary">{roleGuide.decisionRule}</p>
                </div>
              </div>
            </div>

            {siteMemberships.length > 1 && (
              <div className="mb-4 rounded-xl border border-border-subtle bg-surface-subtle/40 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-text-tertiary">Switch wedding</p>
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

            <div className="space-y-6">
              {visibleNavSections.map((section, sectionIndex) => (
                <div key={section.title || `section-${sectionIndex}`}>
                  {section.title && (
                    <button
                      type="button"
                      onClick={() => section.title === 'More' && setShowMoreFeatures((prev) => !prev)}
                      className={`mb-2 flex w-full items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wide ${section.title === 'More' ? 'text-text-secondary hover:text-text-primary' : 'text-text-tertiary'}`}
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
                                flex items-center gap-3 px-4 py-3 rounded-lg text-base
                                transition-colors no-underline min-h-[44px]
                                ${isActive
                                  ? 'bg-primary text-white shadow-sm'
                                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
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

          <div className="p-4 border-t border-border-subtle">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-subtle">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
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

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 border-b border-border-subtle bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
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
                <h1 className="text-lg font-semibold text-text-primary">{currentNavLabel}</h1>
                <p className="text-sm text-text-secondary">Manage your wedding site and guest experience.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {siteSlug && (
                <a
                  href={`/${siteSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface-subtle sm:inline-flex"
                >
                  <ExternalLink className="w-4 h-4" />
                  View site
                </a>
              )}
              {activeSiteRole === 'owner' && (
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  <Heart className="w-4 h-4" />
                  Upgrade
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      {showUpgradeModal && <BillingModal onClose={() => setShowUpgradeModal(false)} />}
    </div>
  );
};
