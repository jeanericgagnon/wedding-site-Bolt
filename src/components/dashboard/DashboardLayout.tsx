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
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { BillingModal } from '../billing/BillingModal';
import { supabase } from '../../lib/supabase';
import { resolvePublicSiteSlugFromRow } from '../../lib/publicSiteSlug';
import { getSiteVisibilityState } from '../../lib/siteVisibilityState';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPage: string;
}

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
  const { user, isDemoMode } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    if (isDemoMode) {
      setSiteSlug('alex-jordan-demo');
      return;
    }

    supabase
      .from('wedding_sites')
.select('id, site_slug, site_url, site_json, is_published, privacy_mode')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
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
      });
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
    { id: 'planning', label: 'Planning', icon: ClipboardList, path: '/dashboard/planning' },
    { id: 'seating', label: 'Seating', icon: Armchair, path: '/dashboard/seating' },
    { id: 'messages', label: 'Messages', icon: Mail, path: '/dashboard/messages' },
    { id: 'vault', label: 'Vault', icon: Image, path: '/dashboard/vault' },
    { id: 'photos', label: 'Photo Sharing', icon: Camera, path: '/dashboard/photos' },
    { id: 'registry', label: 'Registry', icon: Gift, path: '/dashboard/registry', pinned: true },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/dashboard/settings' },
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
                        ${
                          isActive
                            ? 'bg-primary-light text-primary font-medium'
                            : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
                        }
                      `}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}

              {enabledOptionalNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <li key={item.id}>
                    <Link
                      to={item.path}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg text-base
                        transition-colors no-underline min-h-[44px]
                        ${
                          isActive
                            ? 'bg-primary-light text-primary font-medium'
                            : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
                        }
                      `}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}

              <li>
                <button
                  type="button"
                  onClick={() => setShowMoreFeatures((v) => !v)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-base text-text-secondary hover:bg-surface-subtle hover:text-text-primary transition-colors min-h-[44px]"
                >
                  <span className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    <span>More features</span>
                  </span>
                  {showMoreFeatures ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </li>

              {showMoreFeatures && (
                <li className="px-2 py-2">
                  <div className="rounded-xl border border-border-subtle bg-surface-subtle/60 p-3 space-y-2">
                    <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Choose features to pin</p>
                    <div className="space-y-2">
                      {optionalNavItems.map((item) => {
                        const checked = enabledFeatureIds.includes(item.id);
                        const Icon = item.icon;
                        return (
                          <label key={item.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-surface cursor-pointer">
                            <span className="flex items-center gap-3 text-sm text-text-primary">
                              <Icon className="w-4 h-4" aria-hidden="true" />
                              <span>{item.label}</span>
                            </span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleFeature(item.id)}
                              className="h-4 w-4"
                            />
                          </label>
                        );
                      })}
                    </div>
                    {hiddenOptionalNavItems.length > 0 && (
                      <p className="text-xs text-text-tertiary">Hidden until pinned: {hiddenOptionalNavItems.map((item) => item.label).join(', ')}</p>
                    )}
                  </div>
                </li>
              )}
            </ul>
          </nav>

        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ backgroundColor: 'rgba(42, 93, 103, 0.5)' }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-surface border-b border-border-subtle px-4 lg:px-8 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-surface-subtle rounded-lg transition-colors min-h-[44px] min-w-[44px]"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3 ml-auto">
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                Upgrade
              </button>
              {siteSlug ? (
                <a
                  href={`/site/${siteSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors no-underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  Preview site
                </a>
              ) : (
                <span className="hidden md:block text-sm text-text-tertiary">Preview site</span>
              )}
              <div className="w-10 h-10 bg-primary-light rounded-full flex items-center justify-center text-primary font-semibold">
                {getUserInitials()}
              </div>
            </div>
          </div>
        </header>

        {user?.email === 'demo@dayof.love' && (
          <div className="bg-gradient-to-r from-accent to-accent-dark text-white px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4 max-w-6xl">
              <div className="flex-1">
                <p className="font-semibold mb-1">You're viewing a demo</p>
                <p className="text-sm text-white/90">Ready to create your own wedding site? Sign up now for just $49.</p>
              </div>
              <button
                onClick={() => navigate('/templates')}
                className="px-6 py-2.5 bg-white text-accent font-semibold rounded-xl hover:bg-white/95 transition-all shadow-sm whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-accent"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">{children}</main>
      </div>

      {showUpgradeModal && (
        <BillingModal onClose={() => setShowUpgradeModal(false)} />
      )}
    </div>
  );
};
