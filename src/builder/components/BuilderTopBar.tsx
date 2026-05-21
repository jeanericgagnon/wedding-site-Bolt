import React from 'react';
import {
  Eye,
  EyeOff,
  Undo2,
  Redo2,
  Save,
  Globe,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  Files,
  FilePlus2,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  PanelRightClose,
  PanelRightOpen,
  LayoutGrid,
  ImagePlus,
  ExternalLink,
} from 'lucide-react';
import { getSectionManifest } from '../registry/sectionManifests';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBuilderContext } from '../state/builderStore';
import { builderActions } from '../state/builderActions';
import {
  getPublishBlockedHints,
  shouldOpenPhotoTipsFromSearch,
  shouldOpenPublishChecklistFromSearch,
} from '../utils/publishUiHints';
import { selectUndoRedo, selectIsPreviewMode, selectPublishStatus, selectIsDirty } from '../state/builderSelectors';
import { SITE_VISIBILITY_COPY } from '../../lib/siteVisibilityState';
import { copyTextOrDownload } from '../../lib/copyText';
import type { BuilderSectionInstance, BuilderSectionType } from '../../types/builder/section';
import { isSectionAnchorRedundantWithPage, normalizePageAnchorSlug, normalizeSectionAnchorId } from '../utils/sectionAnchors';
import { TEMPLATE_PAGE_GROUPS } from '../constants/templatePageGroups';

type PublicLinkBuilderPage = {
  id?: string | null;
  slug: unknown;
  title?: unknown;
  meta: {
    isHome: boolean;
    isHidden?: boolean;
  };
};

type PublicLinkBuilderSection = Pick<BuilderSectionInstance, 'id' | 'settings' | 'type'> & Partial<Pick<BuilderSectionInstance, 'displayName' | 'enabled'>>;

type PublicLinkBuilderPageWithSections = PublicLinkBuilderPage & {
  sections: PublicLinkBuilderSection[];
};

interface BuilderTopBarProps {
  onSave: () => void;
  onPublish: () => void;
  onFixPublishBlockers?: () => void;
  projectName?: string;
  saveError?: string | null;
  publishError?: string | null;
  publishAttemptedAt?: string | null;
  publishValidationError?: string | null;
  publishIssueKind?: string | null;
  publicSiteSlug?: string | null;
  inspectorHidden?: boolean;
  onToggleInspector?: () => void;
  initialPublishChecklistOpen?: boolean;
}

export const getPublishBlockerUiState = ({
  publishValidationError,
  publishIssueKind,
}: {
  publishValidationError?: string | null;
  publishIssueKind?: string | null;
}) => {
  const hasHardPublishBlocker = Boolean(publishValidationError) && publishIssueKind !== 'unsaved-changes';

  return {
    hasHardPublishBlocker,
    effectivePublishValidationError: hasHardPublishBlocker ? publishValidationError ?? null : null,
    canAutoSaveBeforePublish: Boolean(publishValidationError) && publishIssueKind === 'unsaved-changes',
  };
};

function slugifyPage(input: unknown): string {
  return normalizePageAnchorSlug(input);
}

function getBuilderText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'value' in value && typeof (value as { value?: unknown }).value === 'string') {
    return (value as { value: string }).value;
  }
  return '';
}

export function buildPublicPagePath(siteSlug: string | null | undefined, page: PublicLinkBuilderPage): string | null {
  const cleanedSiteSlug = siteSlug?.trim();
  if (!cleanedSiteSlug) return null;
  if (page.meta.isHidden) return null;
  const encodedSiteSlug = encodeURIComponent(cleanedSiteSlug);
  const normalizedPageSlug = normalizeBuilderPageSlug(page.slug) || normalizeBuilderPageSlug(page.id ?? '');
  if (page.meta.isHome || normalizedPageSlug === 'home') return `/site/${encodedSiteSlug}`;
  return `/site/${encodedSiteSlug}/${encodeURIComponent(normalizedPageSlug || 'page')}`;
}

function normalizeBuilderSectionAnchorId(value: unknown): string {
  return normalizeSectionAnchorId(value);
}

function normalizeBuilderPageSlug(value: unknown): string {
  return slugifyPage(value);
}

function getBuilderPageActionLabel(page: Pick<PublicLinkBuilderPage, 'id' | 'slug' | 'title'>): string {
  const title = getBuilderText(page.title).trim();
  if (title) return title;
  const slug = normalizeBuilderPageSlug(page.slug);
  if (slug) return slug.replace(/-/g, ' ');
  return page.id?.trim() || 'Untitled';
}

function isRedundantDedicatedPageAnchor(
  page: PublicLinkBuilderPage,
  anchorId: string,
): boolean {
  return isSectionAnchorRedundantWithPage(anchorId, page);
}

export function buildPublicSectionAnchorPath(
  siteSlug: string | null | undefined,
  page: PublicLinkBuilderPage,
  section: Pick<BuilderSectionInstance, 'settings'>
): string | null {
  const pagePath = buildPublicPagePath(siteSlug, page);
  const anchorId = normalizeBuilderSectionAnchorId(section.settings?.anchorId);
  if (!pagePath || !anchorId) return null;
  if (isRedundantDedicatedPageAnchor(page, anchorId)) return null;
  return `${pagePath}#${encodeURIComponent(anchorId)}`;
}

export interface PublicSectionAnchorLink {
  section: PublicLinkBuilderSection;
  path: string;
  url: string;
  label: string;
}

export function getPublicSectionAnchorLinks(
  siteSlug: string | null | undefined,
  page: PublicLinkBuilderPageWithSections,
  origin?: string
): PublicSectionAnchorLink[] {
  return page.sections
    .map((section) => {
      if (section.enabled === false) return null;
      const path = buildPublicSectionAnchorPath(siteSlug, page, section);
      if (!path) return null;
      const url = origin ? new URL(path, origin).toString() : path;
      let label = section.displayName;
      if (!label) {
        try {
          label = getSectionManifest(section.type).label;
        } catch {
          label = path.split('#')[1]?.replace(/-/g, ' ') ?? 'Section';
        }
      }
      return { section, path, url, label };
    })
    .filter((item): item is PublicSectionAnchorLink => Boolean(item));
}

export function summarizeBuilderPageStructure(pages: PublicLinkBuilderPageWithSections[]): {
  pageCount: number;
  visiblePageCount: number;
  hiddenPageCount: number;
  anchorLinkCount: number;
  mode: 'single-page' | 'multi-page';
  label: string;
} {
  const visiblePages = pages.filter((page) => page.meta.isHidden !== true);
  const anchorLinkCount = visiblePages.reduce((count, page) => (
    count + page.sections.filter((section) => {
      if (section.enabled === false) return false;
      const anchorId = normalizeBuilderSectionAnchorId(section.settings?.anchorId);
      return anchorId && !isRedundantDedicatedPageAnchor(page, anchorId);
    }).length
  ), 0);
  const visiblePageCount = visiblePages.length;
  const hiddenPageCount = Math.max(pages.length - visiblePageCount, 0);
  const mode = visiblePageCount > 1 ? 'multi-page' : 'single-page';
  const pageLabel = `${visiblePageCount} visible page${visiblePageCount === 1 ? '' : 's'}`;
  const anchorLabel = `${anchorLinkCount} anchor${anchorLinkCount === 1 ? '' : 's'}`;
  const hiddenLabel = hiddenPageCount > 0 ? ` · ${hiddenPageCount} hidden` : '';

  return {
    pageCount: pages.length,
    visiblePageCount,
    hiddenPageCount,
    anchorLinkCount,
    mode,
    label: `${mode === 'multi-page' ? 'Multi-page' : 'Single page'} · ${pageLabel} · ${anchorLabel}${hiddenLabel}`,
  };
}

export function getSuggestedBuilderPages(pages: Array<Pick<PublicLinkBuilderPage, 'id' | 'slug' | 'title' | 'meta'>>): Array<{ title: string; slug: string; initialSectionType?: BuilderSectionType }> {
  const existingSlugs = new Set(
    pages
      .map((page) => normalizeBuilderPageSlug(page.slug) || normalizeBuilderPageSlug(page.id ?? '') || normalizeBuilderPageSlug(page.title))
      .filter(Boolean)
  );
  const existingTitles = new Set(
    pages
      .map((page) => normalizeBuilderPageSlug(page.title))
      .filter(Boolean)
  );

  return TEMPLATE_PAGE_GROUPS
    .filter((group) => !group.isHome)
    .filter((group) => !existingSlugs.has(group.slug) && !existingTitles.has(group.slug))
    .map((group) => ({ title: group.title, slug: group.slug, initialSectionType: group.sectionTypes[0] }));
}

function toValidTopBarDate(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatSavedAt(iso: string): string {
  const d = toValidTopBarDate(iso);
  if (!d) return 'Saved time unknown';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 0) return 'Saved just now';
  if (diffMin < 1) return 'Saved just now';
  if (diffMin === 1) return 'Saved 1 min ago';
  if (diffMin < 60) return `Saved ${diffMin} min ago`;
  return `Saved at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function formatPublishedAt(iso: string): string {
  const d = toValidTopBarDate(iso);
  if (!d) return 'Live since unknown time';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `Live since ${time}`;
  return `Live since ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

export const BuilderTopBar: React.FC<BuilderTopBarProps> = ({
  onSave,
  onPublish,
  onFixPublishBlockers,
  projectName,
  saveError,
  publishError,
  publishAttemptedAt,
  publishValidationError,
  publishIssueKind,
  publicSiteSlug,
  inspectorHidden = false,
  onToggleInspector,
  initialPublishChecklistOpen = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useBuilderContext();
  const undoRedo = selectUndoRedo(state);
  const isPreview = selectIsPreviewMode(state);
  const publishStatus = selectPublishStatus(state);
  const isDirty = selectIsDirty(state);
  const previewViewport = state.previewViewport;

  const publishedAt = state.project?.lastPublishedAt ?? null;
  const publishedVersion = state.project?.publishedVersion ?? null;
  const isPublished = publishStatus === 'published';
  const projectPages = state.project?.pages ?? [];
  const activePage = projectPages.find((p) => p.id === state.activePageId) ?? null;
  const visibleProjectPages = React.useMemo(() => projectPages.filter((page) => page.meta.isHidden !== true), [projectPages]);
  const pageStructureSummary = React.useMemo(() => summarizeBuilderPageStructure(projectPages), [projectPages]);
  const suggestedBuilderPages = React.useMemo(() => getSuggestedBuilderPages(projectPages), [projectPages]);
  const {
    hasHardPublishBlocker,
    effectivePublishValidationError,
    canAutoSaveBeforePublish,
  } = getPublishBlockerUiState({ publishValidationError, publishIssueKind });
  const isPublishDisabled = state.isPublishing || state.isSaving || hasHardPublishBlocker;
  const showPublishReady = !hasHardPublishBlocker && !state.isPublishing && !state.isSaving;
  const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false);
  const [showBlockedDetails, setShowBlockedDetails] = React.useState(false);
  const [showPageManager, setShowPageManager] = React.useState(false);
  const [newPageTitle, setNewPageTitle] = React.useState('');
  const [copiedPageLink, setCopiedPageLink] = React.useState<{ key: string; mode: 'copied' | 'downloaded' } | null>(null);
  const [copiedAnchorLink, setCopiedAnchorLink] = React.useState<{ key: string; mode: 'copied' | 'downloaded' } | null>(null);
  const builderLinkCopyRequestIdRef = React.useRef(0);
  const [showPhotoTips, setShowPhotoTips] = React.useState(() => shouldOpenPhotoTipsFromSearch(location.search));
  const blockedHints = React.useMemo(() => getPublishBlockedHints(effectivePublishValidationError), [effectivePublishValidationError]);
  const [showPublishChecklist, setShowPublishChecklist] = React.useState(
    () => initialPublishChecklistOpen || shouldOpenPublishChecklistFromSearch(location.search)
  );
  const routeWantsPublishChecklist = initialPublishChecklistOpen || shouldOpenPublishChecklistFromSearch(location.search);
  const showVariantQaShortcut = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(location.search);
    return params.get('variantQa') === '1';
  }, [location.search]);

  const checklistItems = React.useMemo(() => {
    const items: Array<{ label: string; done: boolean; detail?: string }> = [];
    items.push({
      label: 'At least one visible page exists',
      done: visibleProjectPages.length > 0,
      detail: visibleProjectPages.length > 0
        ? `${visibleProjectPages.length} visible page${visibleProjectPages.length === 1 ? '' : 's'}`
        : 'Show a page in navigation or add a page from Pages.',
    });
    items.push({
      label: 'Current page has at least one section',
      done: activePage?.meta.isHidden !== true && (activePage?.sections?.length ?? 0) > 0,
      detail: activePage?.meta.isHidden === true
        ? `${activePage?.title ?? 'Current page'} is hidden from guests.`
        : (activePage?.sections?.length ?? 0) > 0
        ? `${activePage?.sections?.length ?? 0} section(s) on ${activePage?.title ?? 'current page'}`
        : `No sections on ${activePage?.title ?? 'current page'} — add one from the right panel.`,
    });
    items.push({ label: 'Ready to share with guests', done: !hasHardPublishBlocker, detail: effectivePublishValidationError ?? 'Ready to share.' });
    items.push({ label: 'Latest edits are saved', done: !isDirty, detail: isDirty ? 'Save your latest changes before sharing.' : 'All changes saved.' });
    return items;
  }, [visibleProjectPages.length, activePage?.meta.isHidden, activePage?.sections?.length, activePage?.title, hasHardPublishBlocker, effectivePublishValidationError, isDirty]);
  const checklistDoneCount = checklistItems.filter((i) => i.done).length;

  React.useEffect(() => {
    if (!copiedPageLink) return;
    const timeout = window.setTimeout(() => setCopiedPageLink(null), 1600);
    return () => window.clearTimeout(timeout);
  }, [copiedPageLink]);

  React.useEffect(() => {
    if (!copiedAnchorLink) return;
    const timeout = window.setTimeout(() => setCopiedAnchorLink(null), 1600);
    return () => window.clearTimeout(timeout);
  }, [copiedAnchorLink]);

  const copyBuilderPublicLink = async (url: string, filename: string) => {
    const requestId = ++builderLinkCopyRequestIdRef.current;
    try {
      const result = await copyTextOrDownload(url, filename);
      if (requestId !== builderLinkCopyRequestIdRef.current) return null;
      return result;
    } catch {
      if (requestId === builderLinkCopyRequestIdRef.current) {
        dispatch(builderActions.setError('Couldn’t copy that public link right now.'));
      }
      return null;
    }
  };

  React.useEffect(() => {
    if (shouldOpenPhotoTipsFromSearch(location.search)) {
      setShowPhotoTips(true);
    }
  }, [location.search]);

  React.useEffect(() => {
    if (!routeWantsPublishChecklist) return;
    setShowPublishChecklist(true);
    const params = new URLSearchParams(location.search);
    const tool = params.get('tool');
    if (tool !== 'share' && tool !== 'qr-codes') return;
    params.delete('tool');
    navigate(`${location.pathname}${params.toString() ? `?${params.toString()}` : ''}${location.hash}`, { replace: true });
  }, [location.hash, location.pathname, location.search, navigate, routeWantsPublishChecklist]);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('photoTips') !== '1') return;
    setShowPhotoTips(true);
    params.delete('photoTips');
    navigate(`${location.pathname}${params.toString() ? `?${params.toString()}` : ''}${location.hash}`, { replace: true });
  }, [location.hash, location.pathname, location.search, navigate]);

  React.useEffect(() => {
    if (!showPhotoTips) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowPhotoTips(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showPhotoTips]);

  React.useEffect(() => {
    if (!showPublishChecklist) return;
    if (checklistDoneCount === checklistItems.length) {
      const t = window.setTimeout(() => setShowPublishChecklist(false), 900);
      return () => window.clearTimeout(t);
    }
  }, [showPublishChecklist, checklistDoneCount, checklistItems.length]);

  const toolbarButtonClass = 'inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[var(--color-border-subtle)] bg-white px-3 py-2 text-[12px] font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)]/25 hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)]';
  const iconButtonClass = 'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-subtle)] hover:bg-white hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:text-[var(--color-text-secondary)]';

  return (
    <>
    <header className="sticky top-0 z-50 flex min-h-[72px] flex-wrap items-center gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-paper)] px-4 py-3 md:flex-nowrap md:px-5">
      <button
        onClick={() => {
          if (isDirty) {
            setShowLeaveConfirm(true);
            return;
          }
          navigate('/dashboard');
        }}
        title="Back to Dashboard"
        className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border border-[var(--color-border-subtle)] bg-white px-3 py-2 text-[12px] font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)]/25 hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft size={15} />
        <span className="hidden sm:inline">Dashboard</span>
      </button>

      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]/75">Website</p>
        <h1 className="truncate font-serif text-xl font-normal leading-tight text-[var(--color-text-primary)]">
          {projectName || 'Wedding site editor'}
        </h1>
      </div>

      <button
        type="button"
        onClick={() => setShowPageManager(true)}
        aria-label={`Manage pages: ${pageStructureSummary.label}`}
        className={toolbarButtonClass}
        title={pageStructureSummary.label}
      >
        <Files size={13} />
        Pages · {pageStructureSummary.visiblePageCount}
        {pageStructureSummary.anchorLinkCount > 0 ? (
          <span className="hidden text-[var(--color-text-tertiary)] sm:inline">· {pageStructureSummary.anchorLinkCount} anchors</span>
        ) : null}
      </button>

      <div className="relative flex items-center gap-1 rounded-[20px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]/60 p-1">
        <button
          onClick={() => dispatch(builderActions.undo())}
          disabled={!undoRedo.canUndo}
          title={`Undo${undoRedo.undoLabel ? `: ${undoRedo.undoLabel}` : ''} (⌘Z)`}
          className={iconButtonClass}
          aria-label="Undo"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={() => dispatch(builderActions.redo())}
          disabled={!undoRedo.canRedo}
          title={`Redo${undoRedo.redoLabel ? `: ${undoRedo.redoLabel}` : ''} (⌘⇧Z)`}
          className={iconButtonClass}
          aria-label="Redo"
        >
          <Redo2 size={16} />
        </button>
      </div>

      <div className="flex-1" />

      <div className="ml-auto flex w-full items-center justify-end gap-2 sm:w-auto">
        {showVariantQaShortcut && (
          <button
            type="button"
            onClick={() => navigate('/dashboard/builder/variants')}
            className={`${toolbarButtonClass} hidden md:inline-flex`}
            title="Open the layout review gallery"
          >
            <LayoutGrid size={14} />
            Layouts
          </button>
        )}
        <button
          type="button"
          onClick={() => dispatch(builderActions.openMediaLibrary())}
          className={toolbarButtonClass}
          title="Add a photo to the media library"
        >
          <ImagePlus size={14} />
          Add photo
        </button>
        {onToggleInspector && (
          <button
            type="button"
            onClick={onToggleInspector}
            className={toolbarButtonClass}
            title={inspectorHidden ? 'Exit full screen' : 'Full screen canvas'}
          >
            {inspectorHidden ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
            {inspectorHidden ? 'Show panel' : 'Full screen'}
          </button>
        )}
        <button
          onClick={() => {
            if (hasHardPublishBlocker) {
              setShowPublishChecklist(true);
              setShowBlockedDetails(true);
              return;
            }
            onPublish();
          }}
          disabled={isPublishDisabled}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-[12px] font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state.isPublishing || state.isSaving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Globe size={14} />
          )}
          {state.isPublishing ? 'Sharing…' : 'Preview / Share'}
        </button>
      </div>

      <div className="hidden">
        <div className="ml-auto flex w-full sm:w-auto items-center justify-end gap-2">
          <label htmlFor="mobile-section-nav" className="text-xs text-gray-500 whitespace-nowrap">Jump to section</label>
          <select
            id="mobile-section-nav"
            value={state.selectedSectionId ?? ''}
            onChange={(e) => {
              const sectionId = e.target.value || null;
              dispatch(builderActions.selectSection(sectionId));
              if (sectionId) {
                requestAnimationFrame(() => {
                  const el = document.querySelector(`[data-section-id="${sectionId}"]`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
              }
            }}
            className="w-full px-2.5 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="">Top of page</option>
            {(activePage?.sections ?? []).map((section, idx) => (
              <option key={section.id} value={section.id}>
                {idx + 1}. {getSectionManifest(section.type).label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="hidden">
        {(activePage?.sections ?? []).slice(0, 8).map((section, idx) => {
          const isSelected = state.selectedSectionId === section.id;
          return (
            <button
              key={section.id}
              onClick={() => {
                dispatch(builderActions.selectSection(section.id));
                requestAnimationFrame(() => {
                  const el = document.querySelector(`[data-section-id="${section.id}"]`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
              }}
              className={`px-2 py-1 rounded-xl text-xs whitespace-nowrap border transition-colors ${
                isSelected
                  ? 'bg-[var(--color-accent-soft)] border-[var(--color-border-subtle)] text-[var(--color-accent)]'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              title={getSectionManifest(section.type).label}
            >
              {idx + 1}. {getSectionManifest(section.type).label}
            </button>
          );
        })}
      </div>

      <div className="hidden">
        {state.isSaving && (
          <span className="hidden sm:flex text-xs text-gray-500 items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" />
            Saving…
          </span>
        )}
        {!state.isSaving && saveError && (
          <span className="text-xs text-[var(--color-accent)] flex items-center gap-1.5 bg-[var(--color-accent-soft)] border border-[var(--color-border-subtle)] px-2 py-1 rounded-xl" title={saveError}>
            <XCircle size={12} />
            Couldn’t save — try again
          </span>
        )}
        {!state.isSaving && !saveError && state.lastSavedAt && !isDirty && (
          <span className="hidden sm:flex text-xs text-[var(--color-accent)] items-center gap-1.5 bg-[var(--color-accent-soft)] border border-[var(--color-border-subtle)] px-2 py-1 rounded-xl" title={`Last saved: ${toValidTopBarDate(state.lastSavedAt)?.toLocaleString() ?? 'Time unavailable'}`}>
            <CheckCircle2 size={12} className="text-[var(--color-primary)]" />
            {formatSavedAt(state.lastSavedAt)}
          </span>
        )}
        {!state.isSaving && !saveError && isDirty && (
          <span className="hidden sm:flex text-xs text-[var(--color-text-secondary)] items-center gap-1.5 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] px-2 py-1 rounded-xl">
            <AlertCircle size={12} />
            Unsaved changes
          </span>
        )}

        {isPublished && publishedAt && !state.isPublishing && !publishError && (
          <span className="text-xs text-gray-500 flex items-center gap-1.5 border-l border-gray-200 pl-2" title={`Published: ${toValidTopBarDate(publishedAt)?.toLocaleString() ?? 'Time unavailable'}`}>
            <Clock size={11} />
            {formatPublishedAt(publishedAt)}
            {typeof publishedVersion === 'number' && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">v{publishedVersion}</span>
            )}
          </span>
        )}
        {publishError && !state.isPublishing && (
          <div className="flex items-center gap-2 border-l border-gray-200 pl-2">
            <span className="text-xs text-[var(--color-accent)] flex items-center gap-1.5" title={publishError}>
              <XCircle size={12} />
              Couldn’t share
            </span>
            <button
              onClick={onPublish}
              disabled={isPublishDisabled}
              className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Retry
            </button>
          </div>
        )}

        {hasHardPublishBlocker && effectivePublishValidationError && !state.isPublishing && (
          <div className="items-center gap-1.5 hidden sm:flex">
            <span className="text-xs text-[var(--color-text-primary)] items-center gap-1.5 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] px-2 py-1 rounded-xl inline-flex" title={effectivePublishValidationError}>
              <AlertCircle size={12} />
              {SITE_VISIBILITY_COPY.draftBadge} still needs a few things
            </span>
            <button
              type="button"
              onClick={() => setShowBlockedDetails((v) => !v)}
              className="text-[11px] rounded border border-[var(--color-border-subtle)] bg-white px-2 py-1 font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
            >
              What is left?
            </button>
            {onFixPublishBlockers && (
              <button
                type="button"
                onClick={onFixPublishBlockers}
                className="text-[11px] rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-2 py-1 font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-accent-soft)]"
              >
                Fix next
              </button>
            )}
          </div>
        )}

        {hasHardPublishBlocker && effectivePublishValidationError && !state.isPublishing && (
          <div className="sm:hidden w-full flex items-center justify-between rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-2 py-1 text-[11px] text-[var(--color-text-primary)]">
            <span className="truncate pr-2">{effectivePublishValidationError}</span>
            <button type="button" onClick={() => setShowBlockedDetails((v) => !v)} className="shrink-0 rounded border border-[var(--color-border-subtle)] bg-white px-1.5 py-0.5 font-medium">
              Left?
            </button>
            {onFixPublishBlockers && (
              <button type="button" onClick={onFixPublishBlockers} className="shrink-0 rounded border border-[var(--color-border-subtle)] bg-white px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]">
                Fix next
              </button>
            )}
          </div>
        )}

        {showBlockedDetails && effectivePublishValidationError && (
          <div className="w-full rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-2 py-2 text-xs text-[var(--color-text-primary)]">
            <p className="font-medium">{effectivePublishValidationError}</p>
            <ul className="list-disc ml-4 mt-1 space-y-0.5">
              {blockedHints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowPublishChecklist((v) => !v)}
          className={`hidden inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-medium ${
            checklistDoneCount === checklistItems.length
              ? 'border-[var(--color-border-subtle)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <CheckCircle2 size={12} />
          Share checklist {checklistDoneCount}/{checklistItems.length}
        </button>

        {showPublishChecklist && (
          <div className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700 shadow-none space-y-1 max-h-64 overflow-y-auto">
            <p className="font-semibold text-gray-800 mb-1">What is left before sharing with guests</p>
            <p className="text-[11px] text-gray-500 mb-2">${SITE_VISIBILITY_COPY.draftExplainer} ${SITE_VISIBILITY_COPY.publishedExplainer}</p>
            <ul className="space-y-1">
              {checklistItems.map((item) => (
                <li key={item.label} className="flex items-start gap-1.5 justify-between">
                  <span className="flex items-start gap-1.5">
                    <span className={item.done ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-tertiary)]'}>{item.done ? '✓' : '•'}</span>
                    <span>
                      <span>{item.label}</span>
                      {item.detail ? <span className={item.done ? 'text-gray-500' : 'text-[var(--color-text-secondary)]'}> — {item.detail}</span> : null}
                    </span>
                  </span>
                  {!item.done && item.label === 'Latest edits are saved' && (
                    <button onClick={() => { onSave(); setShowPublishChecklist(false); }} className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 transition-colors hover:bg-gray-100">Save now</button>
                  )}
                  {!item.done && item.label === 'Ready to share with guests' && onFixPublishBlockers && (
                    <button onClick={() => { onFixPublishBlockers(); setShowPublishChecklist(false); }} className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-accent-soft)]">Fix this</button>
                  )}
                  {!item.done && item.label === 'Ready to share with guests' && publishIssueKind === 'no-enabled-sections' && onFixPublishBlockers && (
                    <button onClick={() => { onFixPublishBlockers(); setShowPublishChecklist(false); }} className="rounded border border-[var(--color-border-subtle)] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-subtle)]">Open section</button>
                  )}
                  {!item.done && item.label === 'Ready to share with guests' && publishIssueKind === 'no-pages' && onFixPublishBlockers && (
                    <button onClick={() => { onFixPublishBlockers(); setShowPublishChecklist(false); }} className="rounded border border-[var(--color-border-subtle)] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-subtle)]">Choose a design</button>
                  )}
                  {!item.done && item.label === 'Ready to share with guests' && ['missing-couple-names', 'missing-event-date', 'missing-venue', 'rsvp-disabled'].includes(publishIssueKind ?? '') && onFixPublishBlockers && (
                    <button onClick={() => { onFixPublishBlockers(); setShowPublishChecklist(false); }} className="rounded border border-[var(--color-border-subtle)] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-subtle)]">Open guidance</button>
                  )}
                  {!item.done && item.label === 'At least one visible page exists' && (
                    <button
                      onClick={() => {
                        dispatch(builderActions.addPage('Home'));
                        setShowPublishChecklist(false);
                      }}
                      className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 transition-colors hover:bg-gray-100"
                    >
                      Add first page
                    </button>
                  )}
                  {!item.done && item.label === 'Current page has at least one section' && (
                    <button
                      onClick={() => {
                        const pageId = state.activePageId;
                        if (!pageId) {
                          setShowPageManager(true);
                          setShowPublishChecklist(false);
                          return;
                        }
                        dispatch(builderActions.addSectionByType(pageId, 'hero'));
                        setShowPublishChecklist(false);
                      }}
                      className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 transition-colors hover:bg-gray-100"
                    >
                      Add first section
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={() => dispatch(builderActions.setMode(isPreview ? 'edit' : 'preview'))}
          className={`hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
            isPreview
              ? 'bg-gray-900 text-white hover:bg-gray-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {isPreview ? <EyeOff size={14} /> : <Eye size={14} />}
          {isPreview ? 'Exit preview' : 'Preview'}
        </button>

        {isPreview && (
          <div className="hidden">
            <button
              type="button"
              onClick={() => dispatch(builderActions.setPreviewViewport('desktop'))}
              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                previewViewport === 'desktop'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Monitor size={12} />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => dispatch(builderActions.setPreviewViewport('tablet'))}
              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                previewViewport === 'tablet'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Tablet size={12} />
              Tablet
            </button>
            <button
              type="button"
              onClick={() => dispatch(builderActions.setPreviewViewport('mobile'))}
              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                previewViewport === 'mobile'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Smartphone size={12} />
              Mobile
            </button>
          </div>
        )}

        <div className="hidden">
          <button
            onClick={onSave}
            disabled={state.isSaving || !isDirty}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
              isDirty && !state.isSaving
                ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-none'
                : 'bg-gray-100 text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
            aria-label="Save draft"
          >
            {state.isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {state.isSaving ? 'Saving…' : isDirty ? 'Save changes' : 'Saved'}
          </button>
          {!isDirty && !state.isSaving && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              All changes saved
            </div>
          )}
        </div>

        <div className="relative group">
          <button
            type="button"
            onClick={() => setShowPhotoTips((v) => !v)}
            aria-expanded={showPhotoTips}
            aria-controls="builder-photo-tips-panel"
            className="hidden inline-flex items-center rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-2 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
            title="Show photo placement tips"
          >
            Photo tips
          </button>
          <button
            onClick={() => {
              if (hasHardPublishBlocker) {
                setShowPublishChecklist(true);
                setShowBlockedDetails(true);
                return;
              }
              onPublish();
            }}
            disabled={isPublishDisabled}
            aria-label={hasHardPublishBlocker && effectivePublishValidationError ? `Share blocked: ${effectivePublishValidationError}` : canAutoSaveBeforePublish ? 'Save changes and share' : 'Share site'}
              title={hasHardPublishBlocker && effectivePublishValidationError ? `${effectivePublishValidationError} (⌘⇧P)` : canAutoSaveBeforePublish ? 'Save your latest changes, then share (⌘⇧P)' : 'Share site (⌘⇧P)'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {state.isPublishing || state.isSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Globe size={14} />
            )}
            {state.isPublishing
              ? 'Sharing…'
              : state.isSaving
                ? 'Waiting for save…'
                : isPublished
                  ? `Update guest-facing site${typeof publishedVersion === 'number' ? ` v${publishedVersion}` : ''}`
                  : 'Share site'}
          </button>
          <div className="absolute top-full right-0 mt-1.5 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 max-w-[260px] text-center">
            {hasHardPublishBlocker && effectivePublishValidationError
              ? effectivePublishValidationError
              : canAutoSaveBeforePublish
                ? 'Save your latest changes, then share (⌘⇧P)'
                : isPublished
                ? 'Updates the live version guests can already see (⌘⇧P)'
                : 'Sharing makes your site visible at your guest-facing dayof URL (⌘⇧P)'}
          </div>
        </div>
      </div>
    </header>
    {showPageManager && (
      <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-xl bg-white shadow-none border border-[var(--color-border-subtle)] p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Pages</h3>
              <p className="text-[11px] text-gray-500 mt-1">{pageStructureSummary.label}</p>
            </div>
            <button type="button" onClick={() => setShowPageManager(false)} aria-label="Close pages manager" className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">Close</button>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <input
              value={newPageTitle}
              onChange={(e) => setNewPageTitle(e.target.value)}
              placeholder="Page name"
              aria-label="New page name"
              className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                dispatch(builderActions.addPage(newPageTitle || undefined));
                setNewPageTitle('');
              }}
              className="inline-flex items-center gap-1 rounded bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800"
            >
              <FilePlus2 size={12} />
              Add page
            </button>
          </div>
          {suggestedBuilderPages.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-gray-500">Quick add</span>
              {suggestedBuilderPages.map((page) => (
                <button
                  key={page.slug}
                  type="button"
                  onClick={() => dispatch(builderActions.addPage(page.title, page.initialSectionType))}
                  aria-label={`Quick add ${page.title} page${page.initialSectionType ? ` with ${getSectionManifest(page.initialSectionType).label}` : ''}`}
                  title={`Create /${page.slug}${page.initialSectionType ? ` with a ${getSectionManifest(page.initialSectionType).label} section` : ''}`}
                  className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-white"
                >
                  {page.title}
                </button>
              ))}
            </div>
          )}

          <div className="max-h-[50vh] overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
            {projectPages.map((page, idx) => {
              const publicPagePath = buildPublicPagePath(publicSiteSlug, page);
              const publicPageUrl = publicPagePath && typeof window !== 'undefined'
                ? new URL(publicPagePath, window.location.origin).toString()
                : publicPagePath;
              const sectionAnchorLinks = getPublicSectionAnchorLinks(
                publicSiteSlug,
                page,
                typeof window !== 'undefined' ? window.location.origin : undefined
              );
              const hasRedundantSectionAnchors = page.sections.some((section) => {
                if (section.enabled === false) return false;
                const anchorId = normalizeBuilderSectionAnchorId(section.settings?.anchorId);
                return Boolean(anchorId) && isRedundantDedicatedPageAnchor(page, anchorId);
              });
              const previousPage = projectPages[idx - 1];
              const canMovePageUp = idx > 0 && !page.meta.isHome && previousPage?.meta.isHome !== true;
              const canMovePageDown = idx < projectPages.length - 1 && !page.meta.isHome;
              const pageActionLabel = getBuilderPageActionLabel(page);
              const pageTitleValue = getBuilderText(page.title);
              const pageSlugValue = getBuilderText(page.slug);

              return (
              <div key={page.id} className="px-3 py-2.5 flex items-center gap-2">
                <div className={`flex-1 min-w-0 rounded border px-2 py-1.5 ${state.activePageId === page.id ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]' : 'border-gray-200 bg-white'}`}>
                  <div className="ml-auto flex w-full sm:w-auto items-center justify-end gap-2">
                    <input
                      value={pageTitleValue}
                      onChange={(e) => {
                        const title = e.target.value;
                        dispatch(builderActions.updatePage(page.id, { title, slug: slugifyPage(title) || pageSlugValue }));
                      }}
                      aria-label={`Page title for ${pageActionLabel}`}
                      className="flex-1 min-w-0 bg-transparent text-sm font-medium text-gray-800 outline-none"
                      placeholder="Page title"
                    />
                    <button
                      type="button"
                      onClick={() => dispatch(builderActions.setActivePage(page.id))}
                      aria-label={state.activePageId === page.id ? `${pageActionLabel} is the current editing page` : `Edit ${pageActionLabel} page`}
                      className={`rounded px-2 py-1 text-[11px] font-medium ${state.activePageId === page.id ? 'bg-[var(--color-accent)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {state.activePageId === page.id ? 'Current' : 'Edit'}
                    </button>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
                    <span>/</span>
                    <input
                      value={pageSlugValue}
                      onChange={(e) => dispatch(builderActions.updatePage(page.id, { slug: slugifyPage(e.target.value) || pageSlugValue }))}
                      disabled={page.meta.isHome}
                      aria-label={`Public URL slug for ${pageActionLabel}`}
                      className="bg-transparent outline-none flex-1 min-w-0 disabled:cursor-not-allowed disabled:text-gray-400"
                      placeholder="page-slug"
                    />
                    {page.meta.isHome ? <span>• Home</span> : null}
                    {page.meta.isHidden ? <span>• Hidden from navigation</span> : null}
                  </div>
                  {publicPagePath ? (
                    <div className="mt-1.5 flex items-center gap-2 rounded bg-gray-50 px-2 py-1 text-[11px] text-gray-500">
                      <span className="min-w-0 flex-1 truncate font-mono">{publicPagePath}</span>
                      <button
                        type="button"
                        aria-label={`Open public page ${pageActionLabel}`}
                        title={`Open ${publicPagePath}`}
                        onClick={() => {
                          if (!publicPageUrl) return;
                          window.open(publicPageUrl, '_blank', 'noopener,noreferrer');
                        }}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-gray-600 hover:bg-white hover:text-gray-900"
                      >
                        <ExternalLink size={10} />
                        Open
                      </button>
                      <button
                        type="button"
                        aria-label={`Copy public page link for ${pageActionLabel}`}
                        title={`Copy ${publicPagePath}`}
                        onClick={async () => {
                          if (!publicPageUrl) return;
                          const key = page.id ?? publicPagePath;
                          const result = await copyBuilderPublicLink(publicPageUrl, 'dayof-public-page-link.txt');
                          if (result) setCopiedPageLink({ key, mode: result });
                        }}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-gray-600 hover:bg-white hover:text-gray-900"
                      >
                        <Copy size={10} />
                        {copiedPageLink?.key === (page.id ?? publicPagePath)
                          ? copiedPageLink.mode === 'downloaded'
                            ? 'Downloaded'
                            : 'Copied'
                          : 'Copy'}
                      </button>
                    </div>
                  ) : page.meta.isHidden ? (
                    <div className="mt-1.5 rounded bg-gray-50 px-2 py-1 text-[11px] text-gray-500">
                      Hidden pages stay out of guest navigation and do not show share links.
                    </div>
                  ) : null}
                  {sectionAnchorLinks.length > 0 && (
                    <div className="mt-1.5 rounded bg-gray-50 px-2 py-1.5">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">Anchor links</p>
                      <div className="space-y-1">
                        {sectionAnchorLinks.map(({ section, path, url, label }) => {
                          const anchorKey = `${page.id}:${section.id}`;
                          return (
                            <div key={anchorKey} className="flex items-center gap-2 text-[11px] text-gray-500">
                              <span className="min-w-0 flex-1 truncate">
                                <span className="font-medium text-gray-600">{label}</span>
                                {' '}
                                <span className="ml-1 font-mono">{path.slice(path.indexOf('#'))}</span>
                              </span>
                              <button
                                type="button"
                                aria-label={`Open ${label} anchor link`}
                                title={`Open ${path}`}
                                onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-gray-600 hover:bg-white hover:text-gray-900"
                              >
                                <ExternalLink size={10} />
                                Open
                              </button>
                              <button
                                type="button"
                                aria-label={`Copy ${label} anchor link`}
                                title={`Copy ${path}`}
                                onClick={async () => {
                                  const result = await copyBuilderPublicLink(url, 'dayof-public-anchor-link.txt');
                                  if (result) setCopiedAnchorLink({ key: anchorKey, mode: result });
                                }}
                                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-gray-600 hover:bg-white hover:text-gray-900"
                              >
                                <Copy size={10} />
                                {copiedAnchorLink?.key === anchorKey
                                  ? copiedAnchorLink.mode === 'downloaded'
                                    ? 'Downloaded'
                                    : 'Copied'
                                  : 'Copy'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {publicPagePath && sectionAnchorLinks.length === 0 && hasRedundantSectionAnchors ? (
                    <div className="mt-1.5 rounded bg-gray-50 px-2 py-1 text-[11px] text-gray-500">
                      This page link already opens the matching guest section.
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => dispatch(builderActions.updatePage(page.id, { meta: { ...page.meta, isHidden: !page.meta.isHidden } }))}
                  disabled={page.meta.isHome}
                  aria-label={page.meta.isHome ? 'Home page is visible in guest navigation' : page.meta.isHidden ? `Show ${pageActionLabel} in navigation` : `Hide ${pageActionLabel} from navigation`}
                  title={page.meta.isHome ? 'Home stays visible as the guest-facing root page' : undefined}
                  className="rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {page.meta.isHome ? 'Home visible' : page.meta.isHidden ? 'Show in nav' : 'Hide from nav'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const updated = [...projectPages];
                    if (!canMovePageUp) return;
                    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
                    dispatch(builderActions.reorderPages(updated.map((p) => p.id)));
                  }}
                  disabled={!canMovePageUp}
                  aria-label={`Move ${pageActionLabel} page up`}
                  title={`Move ${pageActionLabel} page up`}
                  className="rounded border border-gray-200 p-1 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = [...projectPages];
                    if (!canMovePageDown) return;
                    [updated[idx + 1], updated[idx]] = [updated[idx], updated[idx + 1]];
                    dispatch(builderActions.reorderPages(updated.map((p) => p.id)));
                  }}
                  disabled={!canMovePageDown}
                  aria-label={`Move ${pageActionLabel} page down`}
                  title={`Move ${pageActionLabel} page down`}
                  className="rounded border border-gray-200 p-1 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                >
                  <ArrowDown size={12} />
                </button>

                <button
                  type="button"
                  onClick={() => dispatch(builderActions.duplicatePage(page.id))}
                  aria-label={`Duplicate ${pageActionLabel} page`}
                  title={`Duplicate ${pageActionLabel} page`}
                  className="rounded border border-gray-200 p-1 text-gray-600 hover:bg-gray-50"
                >
                  <Copy size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => dispatch(builderActions.removePage(page.id))}
                  disabled={page.meta.isHome || projectPages.length <= 1}
                  aria-label={`Delete ${pageActionLabel} page`}
                  title={page.meta.isHome ? 'Home page cannot be deleted' : `Delete ${pageActionLabel} page`}
                  className="rounded border border-gray-200 p-1 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              );
            })}
          </div>
        </div>
      </div>
    )}
    {showLeaveConfirm && (
      <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl bg-white shadow-none border border-[var(--color-border-subtle)] p-4">
          <h3 className="text-sm font-semibold text-gray-900">Leave site editor?</h3>
          <p className="mt-1 text-sm text-gray-600">You have unsaved changes. If you leave now, your latest edits may be lost.</p>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowLeaveConfirm(false)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Stay
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLeaveConfirm(false);
                navigate('/dashboard');
              }}
              className="rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
            >
              Leave anyway
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};
