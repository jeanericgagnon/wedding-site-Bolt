import { BuilderPage } from '../../types/builder/project';

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

export const getBuilderCommandCenterCopy = ({
  projectName,
  activePageTitle,
  pageCount,
  sectionCount,
  isDirty,
  hasHardPublishBlocker,
  publishValidationError,
  canAutoSaveBeforePublish,
  isPublished,
  publishedVersion,
  publishAttemptedAt,
}: {
  projectName?: string;
  activePageTitle?: string | null;
  pageCount: number;
  sectionCount: number;
  isDirty: boolean;
  hasHardPublishBlocker: boolean;
  publishValidationError?: string | null;
  canAutoSaveBeforePublish: boolean;
  isPublished: boolean;
  publishedVersion?: number | null;
  publishAttemptedAt?: string | null;
}) => {
  const title = projectName?.trim() || 'Wedding site draft';
  const pageLabel = `${pageCount} page${pageCount === 1 ? '' : 's'}`;
  const sectionLabel = sectionCount === 0
    ? 'no sections on this page yet'
    : `${sectionCount} section${sectionCount === 1 ? '' : 's'} on this page`;

  if (hasHardPublishBlocker) {
    return {
      title,
      summary: `${pageLabel} · ${sectionLabel}`,
      tone: 'warning' as const,
      status: 'Launch blocker',
      detail: publishValidationError ?? 'A few launch details still need attention before this goes live.',
    };
  }

  if (canAutoSaveBeforePublish || isDirty) {
    return {
      title,
      summary: `${pageLabel} · ${sectionLabel}`,
      tone: 'neutral' as const,
      status: 'Finish this draft',
      detail: canAutoSaveBeforePublish
        ? 'Save the latest edits, then review before sharing.'
        : 'You have unsaved edits. Save first so publish stays predictable.',
    };
  }

  if (isPublished) {
    return {
      title,
      summary: `${pageLabel} · ${sectionLabel}`,
      tone: 'success' as const,
      status: typeof publishedVersion === 'number' ? `Live v${publishedVersion}` : 'Live',
      detail: publishAttemptedAt
        ? 'Your latest launch attempt completed. Keep editing here before the next update.'
        : 'Guests can already see this site. New edits here will become the next live update.',
    };
  }

  return {
    title,
    summary: `${pageLabel} · ${sectionLabel}`,
    tone: 'success' as const,
    status: 'Ready for final share review',
    detail: activePageTitle
      ? `${activePageTitle} looks ready for one last guest-facing pass before sharing.`
      : 'This draft is in a good place for one last guest-facing pass before sharing.',
  };
};

export function getPageManagerSummary(projectPages: BuilderPage[], activePageId: string | null) {
  const homePage = projectPages.find((page) => page.meta.isHome) ?? projectPages[0] ?? null;
  const activePage = projectPages.find((page) => page.id === activePageId) ?? homePage;
  return {
    totalPages: projectPages.length,
    visiblePages: projectPages.filter((page) => !page.meta.isHidden).length,
    hiddenPages: projectPages.filter((page) => page.meta.isHidden).length,
    emptyPages: projectPages.filter((page) => page.sections.length === 0).length,
    homePageTitle: homePage?.title ?? null,
    activePageTitle: activePage?.title ?? null,
  };
}

export function toValidTopBarTimestamp(iso: string): Date | null {
  return toValidTopBarDate(iso);
}
