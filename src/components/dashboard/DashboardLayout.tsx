import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
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
  Sparkles,
  ExternalLink,
  ClipboardList,
  Armchair,
  Radio,
  ScrollText,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { BillingModal } from '../billing/BillingModal';
import { supabase } from '../../lib/supabase';
import { resolvePublicSiteSlugFromRow } from '../../lib/publicSiteSlug';
import { getSiteVisibilityState } from '../../lib/siteVisibilityState';
import { resolveActiveSiteForUser, resolveActiveSiteRoleForUser } from '../../lib/activeSite';
import { getStoredActiveSiteId, setStoredActiveSiteId } from '../../lib/activeSiteStorage';

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

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, currentPage }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [siteSlug, setSiteSlug] = useState<string | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [siteJsonState, setSiteJsonState] = useState<Record<string, unknown> | null>(null);
  const [siteIsPublished, setSiteIsPublished] = useState(false);
  const [sitePrivacyMode, setSitePrivacyMode] = useState<'public' | 'password_protected' | 'invite_only'>('public');
  const [showMoreFeatures, setShowMoreFeatures] = useState(false);
  const [enabledFeatureIds, setEnabledFeatureIds] = useState<string[]>([]);
  const [siteMemberships, setSiteMemberships] = useState<SiteMembershipOption[]>([]);
  const [activeSiteRole, setActiveSiteRole] = useState<string | null>(null);
  const { user, isDemoMode } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    if (isDemoMode) {
      setSiteSlug('alex-jordan-demo');
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
        label: [site.couple_name_1, site.couple_name_2].filter(Boolean).join(' & ') || site.site_slug || 'Wedding site',
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
        label: [row.wedding_sites?.couple_name_1, row.wedding_sites?.couple_name_2].filter(Boolean).join(' & ') || row.wedding_sites?.site_slug || 'Wedding site',
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
      const resolved = resolvePublicSiteSlugFromRow(row);
      if (resolved) setSiteSlug(resolved);
      if (row?.id && typeof row.id === 'string') setSiteId(row.id);
      setSiteIsPublished(row?.is_published === true);
      if (row?.privacy_mode === 'password_protected' || row?.privacy_mode === 'invite_only' || row?.privacy_mode === 'public') {
        setSitePrivacyMode(row.privacy_mode);
      }

      const siteJson = row?.site_json;
      if (siteJson && typeof siteJson === 'object' && !Array.isArray(siteJson)) {
        const parsedSiteJson = siteJson as Record<string, unknown>;
        setSiteJsonState(parsedSiteJson);
        const dashboard = parsedSiteJson.dashboard;
        if (dashboard && typeof dashboard === 'object' && !Array.isArray(dashboard)) {
          const sidebarFeatures = (dashboard as Record<string, unknown>).sidebarFeatures;
          if (Array.isArray(sidebarFeatures)) {
            const parsed = sidebarFeatures.filter((v): v is string => typeof v === 'string');
            if (parsed.length > 0) {
              setEnabledFeatureIds(parsed);
              return;
            }
          }
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

  const navItems: Array<{
    id: string;
    label: string;
    icon: LucideIcon;
    path: string;
    pinned?: boolean;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/dashboard/overview', pinned: true },
    { id: 'builder', label: 'Your Site', icon: Palette, path: '/dashboard/builder', pinned: true },
    { id: 'guests', label: 'Guests & RSVP', icon: Users, path: '/dashboard/guests', pinned: true },
    { id: 'itinerary', label: 'Itinerary', icon: Calendar, path: '/dashboard/itinerary', pinned: true },
    { id: 'coordinator', label: 'Coordinator Mode', icon: Radio, path: '/dashboard/coordinator' },
    { id: 'messages', label: 'Messages', icon: Mail, path: '/dashboard/messages' },
    { id: 'seating', label: 'Seating', icon: Armchair, path: '/dashboard/seating' },
    { id: 'planning', label: 'Planning', icon: ClipboardList, path: '/dashboard/planning' },
    { id: 'vault', label: 'Vault', icon: Image, path: '/dashboard/vault' },
    { id: 'photos', label: 'Photo Sharing', icon: Camera, path: '/dashboard/photos' },
    { id: 'registry', label: 'Registry', icon: Gift, path: '/dashboard/registry', pinned: true },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/dashboard/settings' },
    { id: 'audit-logs', label: 'Audit Logs', icon: ScrollText, path: '/dashboard/audit-logs' },
  ];

  const pinnedNavItems = navItems.filter((item) => item.pinned);
  const optionalNavItems = navItems.filter((item) => !item.pinned);
  const enabledOptionalNavItems = optionalNavItems.filter((item) => enabledFeatureIds.includes(item.id));
  const hiddenOptionalNavItems = optionalNavItems.filter((item) => !enabledFeatureIds.includes(item.id));

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('dashboard-enabled-features');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setEnabledFeatureIds((prev) => prev.length > 0 ? prev : parsed.filter((v): v is string => typeof v === 'string'));
          return;
        }
      }
    } catch {
      // ignore localStorage issues
    }
    setEnabledFeatureIds((prev) => prev.length > 0 ? prev : ['settings']);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('dashboard-enabled-features', JSON.stringify(enabledFeatureIds));
    } catch {
      // ignore localStorage issues
    }
  }, [enabledFeatureIds]);

  useEffect(() => {
    if (!siteId) return;
    const timeout = window.setTimeout(() => {
      const nextSiteJson: Record<string, unknown> = {
        ...(siteJsonState ?? {}),
        dashboard: {
          ...(((siteJsonState ?? {}).dashboard as Record<string, unknown> | undefined) ?? {}),
          sidebarFeatures: enabledFeatureIds,
        },
      };
      setSiteJsonState(nextSiteJson);
      void supabase
        .from('wedding_sites')
        .update({ site_json: nextSiteJson })
        .eq('id', siteId);
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [siteId, enabledFeatureIds]);

  const toggleFeature = (id: string) => {
    setEnabledFeatureIds((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]);
  };

  const handleSiteSwitch = (nextSiteId: string) => {
    setStoredActiveSiteId(nextSiteId);
    window.location.reload();
  };

  const siteVisibility = useMemo(() => getSiteVisibilityState({ isPublished: siteIsPublished, privacyMode: sitePrivacyMode, hideFromSearch: siteJsonState?.hide_from_search === true }), [siteIsPublished, sitePrivacyMode, siteJsonState]);

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

            <ul className="space-y-1">
              {pinnedNavItems.map((item) => {
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

            {(enabledOptionalNavItems.length > 0 || hiddenOptionalNavItems.length > 0) && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowMoreFeatures((prev) => !prev)}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  <span>More features</span>
                  {showMoreFeatures ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                {showMoreFeatures && (
                  <div className="mt-2 space-y-1">
                    {enabledOptionalNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentPage === item.id;
                      return (
                        <div key={item.id} className="flex items-center gap-2">
                          <Link
                            to={item.path}
                            className={`
                              flex-1 flex items-center gap-3 px-4 py-3 rounded-lg text-base
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
                          <button
                            type="button"
                            onClick={() => toggleFeature(item.id)}
                            className="px-2 py-2 text-xs text-text-tertiary hover:text-text-primary"
                            aria-label={`Hide ${item.label}`}
                          >
                            Hide
                          </button>
                        </div>
                      );
                    })}

                    {hiddenOptionalNavItems.length > 0 && (
                      <div className="mt-3 border-t border-border-subtle pt-3">
                        <p className="px-4 text-xs uppercase tracking-wide text-text-tertiary">Hidden</p>
                        <div className="mt-2 space-y-1">
                          {hiddenOptionalNavItems.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => toggleFeature(item.id)}
                              className="w-full flex items-center justify-between px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-subtle rounded-lg"
                            >
                              <span>{item.label}</span>
                              <span className="text-xs">Show</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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
                <h1 className="text-lg font-semibold text-text-primary">{navItems.find((item) => item.id === currentPage)?.label || 'Dashboard'}</h1>
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
                  <Sparkles className="w-4 h-4" />
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
