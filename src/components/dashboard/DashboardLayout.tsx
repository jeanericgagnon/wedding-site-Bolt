import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Settings,
  Menu,
  X,
  ExternalLink,
  ChevronDown,
  Pin,
  PinOff,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { BillingModal } from '../billing/BillingModal';
import { getSiteVisibilityState } from '../../lib/siteVisibilityState';
import { ACTIVE_SITE_STORAGE_CHANGED_EVENT, getStoredActiveSiteId, setStoredActiveSiteId } from '../../lib/activeSiteStorage';
import { hasPlannerPermission, type PlannerPermissionKey } from '../../lib/plannerAccess';
import {
  createDemoDashboardLayoutSiteContext,
  loadDashboardLayoutSiteContext,
  type DashboardLayoutSiteContext,
  type DashboardRole,
  type SiteMembershipOption,
} from './dashboardLayoutSiteContext';
import {
  DASHBOARD_NAV_PIN_STORAGE_KEY,
  DASHBOARD_TOOL_GROUPS,
  DEFAULT_DASHBOARD_TOOLS,
  PINNABLE_NAV_TOOL_IDS,
  getAllDashboardTools,
  readStoredToolPins,
  writeStoredToolPins,
  type DashboardTool,
  type DashboardToolId,
} from '../../pages/dashboard/dashboardToolLibrary';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPage: string;
}

function togglePin(ids: DashboardToolId[], id: DashboardToolId) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

function buildWorkspaceLabel(siteMemberships: SiteMembershipOption[], siteId: string | null, siteSlug: string | null, isDemoMode: boolean) {
  if (isDemoMode) return 'Alex & Jordan';
  const activeMembership = siteMemberships.find((site) => site.id === siteId);
  if (activeMembership?.label) {
    return activeMembership.label.split('—')[0]?.trim() || activeMembership.label;
  }
  if (siteSlug) {
    return siteSlug
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
  return 'Your wedding';
}

function applySiteContext(
  siteContext: DashboardLayoutSiteContext,
  setters: {
    setActiveSitePermissions: React.Dispatch<React.SetStateAction<PlannerPermissionKey[] | null>>;
    setActiveSiteRole: React.Dispatch<React.SetStateAction<DashboardRole | null>>;
    setSiteGuestFacingReady: React.Dispatch<React.SetStateAction<boolean>>;
    setSiteId: React.Dispatch<React.SetStateAction<string | null>>;
    setSiteIsPublished: React.Dispatch<React.SetStateAction<boolean>>;
    setSiteJsonState: React.Dispatch<React.SetStateAction<Record<string, unknown> | null>>;
    setSiteMemberships: React.Dispatch<React.SetStateAction<SiteMembershipOption[]>>;
    setSitePrivacyMode: React.Dispatch<React.SetStateAction<'public' | 'password_protected' | 'invite_only' | 'hidden'>>;
    setSiteSlug: React.Dispatch<React.SetStateAction<string | null>>;
  },
) {
  setters.setActiveSitePermissions(siteContext.activeSitePermissions);
  setters.setActiveSiteRole(siteContext.activeSiteRole);
  setters.setSiteGuestFacingReady(siteContext.siteGuestFacingReady);
  setters.setSiteId(siteContext.siteId);
  setters.setSiteIsPublished(siteContext.siteIsPublished);
  setters.setSiteJsonState(siteContext.siteJsonState);
  setters.setSiteMemberships(siteContext.siteMemberships);
  setters.setSitePrivacyMode(siteContext.sitePrivacyMode);
  setters.setSiteSlug(siteContext.siteSlug);
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, currentPage }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [siteContextReady, setSiteContextReady] = useState(false);
  const [siteSlug, setSiteSlug] = useState<string | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [siteJsonState, setSiteJsonState] = useState<Record<string, unknown> | null>(null);
  const [siteIsPublished, setSiteIsPublished] = useState(false);
  const [siteGuestFacingReady, setSiteGuestFacingReady] = useState(false);
  const [sitePrivacyMode, setSitePrivacyMode] = useState<'public' | 'password_protected' | 'invite_only' | 'hidden'>('public');
  const [showMoreFeatures, setShowMoreFeatures] = useState(true);
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);
  const [navPins, setNavPins] = useState<DashboardToolId[]>([]);
  const [siteMemberships, setSiteMemberships] = useState<SiteMembershipOption[]>([]);
  const [activeSiteRole, setActiveSiteRole] = useState<DashboardRole | null>(null);
  const [activeSitePermissions, setActiveSitePermissions] = useState<PlannerPermissionKey[] | null>(null);
  const { user, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const siteContextRequestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++siteContextRequestIdRef.current;
    const isCurrentSiteContextRequest = () => requestId === siteContextRequestIdRef.current;

    const applyLoadedSiteContext = (siteContext: DashboardLayoutSiteContext) => applySiteContext(siteContext, {
      setActiveSitePermissions,
      setActiveSiteRole,
      setSiteGuestFacingReady,
      setSiteId,
      setSiteIsPublished,
      setSiteJsonState,
      setSiteMemberships,
      setSitePrivacyMode,
      setSiteSlug,
    });
    const applyEmptySiteContext = () => applyLoadedSiteContext({
      activeSitePermissions: null,
      activeSiteRole: null,
      siteGuestFacingReady: false,
      siteId: null,
      siteIsPublished: false,
      siteJsonState: null,
      siteMemberships: [],
      sitePrivacyMode: 'public',
      siteSlug: null,
    });

    if (!user) {
      applyEmptySiteContext();
      setSiteContextReady(false);
      return;
    }

    if (isDemoMode) {
      if (!isCurrentSiteContextRequest()) return;
      applyLoadedSiteContext(createDemoDashboardLayoutSiteContext());
      setSiteContextReady(true);
      return;
    }

    const loadSiteContext = async () => {
      setSiteContextReady(false);

      try {
        const siteContext = await loadDashboardLayoutSiteContext(user.id);
        if (!isCurrentSiteContextRequest()) return;
        applyLoadedSiteContext(siteContext);
        setSiteContextReady(true);
      } catch {
        if (!isCurrentSiteContextRequest()) return;
        applyEmptySiteContext();
        setSiteContextReady(true);
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

  useEffect(() => {
    const syncPins = () => setNavPins(readStoredToolPins(DASHBOARD_NAV_PIN_STORAGE_KEY, siteId ?? getStoredActiveSiteId()));
    syncPins();
    window.addEventListener('dayof:dashboard-tool-pins-changed', syncPins);
    window.addEventListener('storage', syncPins);
    window.addEventListener(ACTIVE_SITE_STORAGE_CHANGED_EVENT, syncPins);
    return () => {
      window.removeEventListener('dayof:dashboard-tool-pins-changed', syncPins);
      window.removeEventListener('storage', syncPins);
      window.removeEventListener(ACTIVE_SITE_STORAGE_CHANGED_EVENT, syncPins);
    };
  }, [siteId]);

  const defaultNavTools = DEFAULT_DASHBOARD_TOOLS
    .filter((tool) => tool.id !== 'tools')
    .map((tool) => ({ ...tool, label: tool.name }));
  const optionalNavTools = getAllDashboardTools()
    .filter((tool) => PINNABLE_NAV_TOOL_IDS.includes(tool.id) && navPins.includes(tool.id))
    .map((tool) => ({ ...tool, label: tool.name }));

  const navSections: Array<{
    title?: string;
    items: Array<DashboardTool & { label: string }>;
  }> = [
    {
      items: defaultNavTools,
    },
    ...(optionalNavTools.length > 0 ? [{ title: 'Added tools', items: optionalNavTools }] : []),
  ];

  const role = activeSiteRole ?? 'owner';
  const canSeeNavItem = (itemId: string) => {
    if (role === 'owner') return true;
    if (itemId === 'overview' || itemId === 'tools') return true;
    if (itemId === 'activity') return true;
    if (
      itemId === 'guests'
      || itemId === 'address-collection'
      || itemId === 'guest-details'
      || itemId === 'guest-questions'
      || itemId === 'import-export'
      || itemId === 'thank-you-notes'
    ) return hasPlannerPermission(role, activeSitePermissions, 'guests');
    if (itemId === 'messages') return hasPlannerPermission(role, activeSitePermissions, 'messages');
    if (itemId === 'planning' || itemId === 'vendors' || itemId === 'name-change' || itemId === 'song-requests') return hasPlannerPermission(role, activeSitePermissions, 'planning')
      || hasPlannerPermission(role, activeSitePermissions, 'budget')
      || hasPlannerPermission(role, activeSitePermissions, 'vendors');
    if (
      itemId === 'builder'
      || itemId === 'advanced-design'
      || itemId === 'qr-codes'
      || itemId === 'travel-stay'
    ) return hasPlannerPermission(role, activeSitePermissions, 'settings');
    if (itemId === 'itinerary') return hasPlannerPermission(role, activeSitePermissions, 'timeline');
    if (itemId === 'seating') return hasPlannerPermission(role, activeSitePermissions, 'seating');
    if (itemId === 'coordinator' || itemId === 'wedding-day') return hasPlannerPermission(role, activeSitePermissions, 'coordinator');
    if (itemId === 'registry') return hasPlannerPermission(role, activeSitePermissions, 'registry');
    if (
      itemId === 'photos'
      || itemId === 'anniversary-capsules'
      || itemId === 'guestbook-prompts'
      || itemId === 'photo-recap'
      || itemId === 'vault'
      || itemId === 'vaults'
      || itemId === 'video-uploads'
    ) return hasPlannerPermission(role, activeSitePermissions, 'photos');
    if (itemId === 'settings' || itemId === 'privacy-access' || itemId === 'data-settings') return hasPlannerPermission(role, activeSitePermissions, 'settings');
    return false;
  };

  const visibleNavSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canSeeNavItem(item.id)),
    }))
    .filter((section) => section.items.length > 0);
  const moreToolGroups = DASHBOARD_TOOL_GROUPS.map((group) => ({
    ...group,
    tools: group.tools.filter((tool) => !tool.adminOnly && canSeeNavItem(tool.id)),
  })).filter((group) => group.tools.length > 0);
  const moreToolsActive = currentPage === 'tools' || DASHBOARD_TOOL_GROUPS.some((group) => group.tools.some((tool) => tool.id === currentPage));
  const navPinSet = useMemo(() => new Set(navPins), [navPins]);
  const handleToggleNavPin = (toolId: DashboardToolId) => {
    writeStoredToolPins(DASHBOARD_NAV_PIN_STORAGE_KEY, togglePin(navPins, toolId), siteId ?? getStoredActiveSiteId());
  };

  useEffect(() => {
    if (!siteContextReady || !activeSiteRole) return;
    const knownHiddenTool = getAllDashboardTools().some((tool) => tool.id === currentPage);
    const knownLegacyTool = ['itinerary', 'vault', 'coordinator', 'audit-logs', 'seating-lookup'].includes(currentPage);
    const canAccessCurrentPage = visibleNavSections.some((section) => section.items.some((item) => item.id === currentPage))
      || ((knownHiddenTool || knownLegacyTool) && canSeeNavItem(currentPage));
    if (!canAccessCurrentPage) {
      navigate('/dashboard/overview', { replace: true });
    }
  }, [activeSitePermissions, activeSiteRole, currentPage, navigate, siteContextReady, visibleNavSections]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [currentPage]);

  const handleSiteSwitch = (nextSiteId: string) => {
    setStoredActiveSiteId(nextSiteId);
    window.location.reload();
  };

  const siteVisibility = useMemo(() => getSiteVisibilityState({
    isPublished: siteIsPublished,
    privacyMode: sitePrivacyMode,
    hideFromSearch: siteJsonState?.hide_from_search === true,
    isGuestFacingReady: siteGuestFacingReady,
  }), [siteGuestFacingReady, siteIsPublished, sitePrivacyMode, siteJsonState]);
  const workspaceLabel = useMemo(
    () => buildWorkspaceLabel(siteMemberships, siteId, siteSlug, isDemoMode),
    [isDemoMode, siteId, siteMemberships, siteSlug]
  );
  const previewShareHref = siteVisibility.state === 'draft' ? '/dashboard/builder' : siteSlug ? `/site/${siteSlug}` : '/dashboard/builder';
  const previewShareExternal = siteVisibility.state !== 'draft' && Boolean(siteSlug);
  const currentNavLabel = visibleNavSections.flatMap((section) => section.items).find((item) => item.id === currentPage)?.label
    || getAllDashboardTools().find((tool) => tool.id === currentPage)?.name
    || (currentPage === 'itinerary' ? 'Schedule'
      : currentPage === 'vault' ? 'Vaults'
        : currentPage === 'coordinator' ? 'Day-of'
          : currentPage === 'audit-logs' ? 'Activity'
            : 'Dashboard');
  const pageSubtitles: Record<string, string> = {
    overview: 'Everything guests need, in one calm place.',
    builder: 'Manage what guests see.',
    guests: 'People, replies, and details.',
    itinerary: 'A weekend guests can follow easily.',
    messages: 'Updates guests can actually use.',
    photos: 'Photos, notes, and moments from the celebration.',
    planning: 'Plans, notes, and finishing touches.',
    registry: 'Gifts and funds, clearly shared.',
    seating: 'Tables, assignments, and lookup.',
    coordinator: 'Everything your helpers need on the wedding day.',
    vault: 'Private keepsakes, files, and memories.',
    settings: 'Access, privacy, billing, notifications, and account details.',
    tools: 'Everything else stays close, without taking over.',
    activity: 'Recent changes, quietly gathered.',
    'audit-logs': 'Recent changes, quietly gathered.',
    'wedding-day': 'Everything your helpers need on the wedding day.',
    'name-change': 'Name change, organized when you need it.',
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
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-2xl font-serif font-normal text-text-primary">dayof</p>
                <p className="mt-1 truncate text-xs text-text-secondary">{workspaceLabel}</p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-xl p-2 transition-colors hover:bg-surface-subtle lg:hidden"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <nav className="flex-1 px-3 pb-4 overflow-y-auto" aria-label="Dashboard navigation">
            <div className="mb-5 border-b border-border-subtle pb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Guest site</p>
              <p className="mt-1 text-sm font-medium text-text-primary">{siteVisibility.label}</p>
              {siteSlug && <p className="mt-1 truncate text-xs text-text-secondary">{siteSlug}.dayof.love</p>}
            </div>

            {siteMemberships.length > 1 && (
              <div className="mb-4 rounded-2xl bg-white px-4 py-3 ring-1 ring-border-subtle">
                <p className="text-[11px] font-medium text-text-tertiary">Switch wedding</p>
                <select
                  value={siteId || ''}
                  onChange={(e) => handleSiteSwitch(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-border-subtle bg-white px-3 py-2 text-sm text-text-primary"
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
                      onClick={() => section.title === 'Added tools' && setShowMoreFeatures((prev) => !prev)}
                      className={`mb-1 flex w-full items-center justify-between px-4 py-2 text-xs font-medium ${section.title === 'Added tools' ? 'text-text-secondary hover:text-text-primary' : 'text-text-tertiary'}`}
                    >
                      <span>{section.title}</span>
                    </button>
                  )}

                  {(section.title !== 'Added tools' || showMoreFeatures) && (
                    <ul className="space-y-1">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentPage === item.id;
                        return (
                          <li key={item.id}>
                            <Link
                              to={item.path}
                              className={`
                                flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm
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

              {moreToolGroups.length > 0 && (
                <div className="pt-2 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setMoreToolsOpen((value) => !value)}
                    className={`
                      flex min-h-[44px] w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-colors
                      ${moreToolsActive || moreToolsOpen
                        ? 'bg-primary/10 text-text-primary'
                        : 'text-text-secondary hover:bg-surface-subtle/75 hover:text-text-primary'
                      }
                    `}
                    aria-expanded={moreToolsOpen}
                  >
                    <Settings className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className="flex-1 text-left">More</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${moreToolsOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>

                  {moreToolsOpen && (
                    <div className="mt-2 space-y-3 rounded-2xl border border-border-subtle bg-white p-2 shadow-sm">
                      <Link
                        to="/dashboard/tools"
                        className="block rounded-xl px-3 py-2 text-xs font-semibold text-primary no-underline hover:bg-primary/5"
                        onClick={() => setSidebarOpen(false)}
                      >
                        Choose visible tools
                      </Link>
                      {moreToolGroups.map((group) => (
                        <div key={group.title}>
                          <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">{group.title}</p>
                          <ul className="space-y-1">
                            {group.tools.map((tool) => {
                              const Icon = tool.icon;
                              const canPin = tool.canPinToNav && PINNABLE_NAV_TOOL_IDS.includes(tool.id);
                              const isPinned = navPinSet.has(tool.id);
                              return (
                                <li key={tool.id} className="flex items-center gap-1">
                                  <Link
                                    to={tool.path}
                                    className="flex min-h-[38px] min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2 text-xs text-text-secondary no-underline hover:bg-surface-subtle hover:text-text-primary"
                                    onClick={() => setSidebarOpen(false)}
                                  >
                                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                                    <span className="truncate">{tool.name}</span>
                                  </Link>
                                  {canPin && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleNavPin(tool.id)}
                                      className={`flex h-8 shrink-0 items-center justify-center gap-1 rounded-xl border px-2 text-[11px] font-medium transition-colors ${
                                        isPinned
                                          ? 'border-primary/25 bg-primary/10 text-primary'
                                          : 'border-border-subtle bg-white text-text-tertiary hover:text-text-primary'
                                      }`}
                                      aria-label={isPinned ? `Keep ${tool.name} tucked away` : `Show ${tool.name} in sidebar`}
                                    >
                                      {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                                      <span>{isPinned ? 'Tuck away' : 'Show'}</span>
                                    </button>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </nav>

          <div className="p-3">
            <div className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3 ring-1 ring-border-subtle">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-text-primary">
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
                className="inline-flex items-center gap-2 rounded-xl border border-border-subtle px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-subtle hover:text-text-primary lg:hidden"
                aria-label="Open sections"
              >
                <Menu className="w-4 h-4" />
                <span>Sections</span>
              </button>
              <div>
                <h1 className="text-base font-semibold text-text-primary">{currentNavLabel}</h1>
                <p className="hidden text-sm text-text-secondary sm:block">{pageSubtitles[currentPage] ?? 'Everything for the day in one calm place.'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={previewShareHref}
                target={previewShareExternal ? '_blank' : undefined}
                rel={previewShareExternal ? 'noopener' : undefined}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              >
                <ExternalLink className="w-4 h-4" />
                Preview / Share
              </a>
              <button
                type="button"
                className="hidden h-10 w-10 items-center justify-center rounded-xl border border-border-subtle bg-white text-text-secondary hover:bg-surface-subtle hover:text-text-primary md:inline-flex"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
              </button>
              {activeSiteRole === 'owner' && (
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="hidden items-center gap-2 rounded-xl border border-border-subtle bg-white px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface-subtle sm:inline-flex"
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
