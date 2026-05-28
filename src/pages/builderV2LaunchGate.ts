import type { BuilderV2DocumentAudit, BuilderV2DocumentAuditIssue } from './builderV2DocumentAudit';
import type { BuilderV2ReviewPageSnapshot } from './builderV2DocumentReviewState';

export type BuilderV2LaunchGateAction =
  | { kind: 'review-audit-issue'; label: string; issue: BuilderV2DocumentAuditIssue }
  | { kind: 'review-preview-page'; label: string; device: 'desktop' | 'mobile'; pageId: string; pageTitle: string }
  | { kind: 'switch-preview-device'; label: string; device: 'desktop' | 'mobile' }
  | { kind: 'mark-preview-reviewed'; label: string; device: 'desktop' | 'mobile' }
  | { kind: 'open-export'; label: string };

export type BuilderV2LaunchGateChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  detail: string;
  action: BuilderV2LaunchGateAction | null;
};

export type BuilderV2LaunchGateSummary = {
  status: 'blocked' | 'review' | 'ready';
  headline: string;
  detail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  keyStats: string[];
  checklistItems: BuilderV2LaunchGateChecklistItem[];
  primaryAction: BuilderV2LaunchGateAction;
};

export type BuilderV2LaunchGatePreviewCoverage = {
  reviewedPageCount: number;
  totalPageCount: number;
  currentPageReviewed: boolean;
  nextPageId: string | null;
  nextPageTitle: string | null;
};

type Params = {
  pages: BuilderV2ReviewPageSnapshot[];
  audit: BuilderV2DocumentAudit;
  previewDevice: 'desktop' | 'mobile';
  activePageId: string;
  previewReviewed: Record<'desktop' | 'mobile', BuilderV2LaunchGatePreviewCoverage>;
};

const getAuditAction = (issue: BuilderV2DocumentAuditIssue): BuilderV2LaunchGateAction => ({
  kind: 'review-audit-issue',
  label: issue.actionLabel,
  issue,
});

const getPreviewCoverageDetail = (
  coverage: BuilderV2LaunchGatePreviewCoverage,
  device: 'desktop' | 'mobile',
) => {
  if (!coverage.totalPageCount) {
    return `No visible pages are left to review on ${device}.`;
  }

  return coverage.currentPageReviewed
    ? `${coverage.reviewedPageCount} of ${coverage.totalPageCount} visible page${coverage.totalPageCount === 1 ? '' : 's'} have been checked on ${device}.`
    : `${coverage.reviewedPageCount} of ${coverage.totalPageCount} visible page${coverage.totalPageCount === 1 ? '' : 's'} have been checked on ${device}, and this page is still unreviewed.`;
};

const getPreviewReviewAction = ({
  device,
  currentDevice,
  currentPageId,
  coverage,
}: {
  device: 'desktop' | 'mobile';
  currentDevice: 'desktop' | 'mobile';
  currentPageId: string;
  coverage: BuilderV2LaunchGatePreviewCoverage;
}): BuilderV2LaunchGateAction => {
  if (coverage.nextPageId && coverage.nextPageId !== currentPageId) {
    return {
      kind: 'review-preview-page',
      label: `Review ${coverage.nextPageTitle ?? 'next page'} on ${device}`,
      device,
      pageId: coverage.nextPageId,
      pageTitle: coverage.nextPageTitle ?? 'Next page',
    };
  }

  if (device !== currentDevice) {
    return { kind: 'switch-preview-device', label: `Switch to ${device}`, device };
  }

  return { kind: 'mark-preview-reviewed', label: `Mark ${device} checked`, device };
};

export const buildBuilderV2LaunchGate = ({
  pages,
  audit,
  previewDevice,
  activePageId,
  previewReviewed,
}: Params): BuilderV2LaunchGateSummary => {
  const visiblePages = pages.filter((page) => !page.hidden && page.sections.some((section) => section.enabled));
  const visibleSections = visiblePages.flatMap((page) => page.sections.filter((section) => section.enabled));
  const visibleNonEmptySections = visibleSections.filter((section) => section.blockCount > 0);
  const criticalIssue = audit.issues.find((issue) => issue.severity === 'critical') ?? null;
  const warningIssue = audit.issues.find((issue) => issue.severity === 'warning') ?? null;
  const watchIssue = audit.issues.find((issue) => issue.severity === 'watch') ?? null;
  const desktopCoverage = previewReviewed.desktop;
  const mobileCoverage = previewReviewed.mobile;

  const checklistItems: BuilderV2LaunchGateChecklistItem[] = [
    {
      id: 'visible-story',
      label: 'Visible story exists',
      done: visibleNonEmptySections.length > 0,
      detail: visibleNonEmptySections.length > 0
        ? `${visibleNonEmptySections.length} visible section${visibleNonEmptySections.length === 1 ? '' : 's'} are carrying real content.`
        : 'The public read is still blank or structurally empty.',
      action: criticalIssue ? getAuditAction(criticalIssue) : null,
    },
    {
      id: 'critical',
      label: 'No critical structure blockers',
      done: audit.criticalCount === 0,
      detail: audit.criticalCount === 0
        ? 'No visible lane is empty or structurally broken.'
        : `${audit.criticalCount} critical issue${audit.criticalCount === 1 ? '' : 's'} still need direct repair.`,
      action: criticalIssue ? getAuditAction(criticalIssue) : null,
    },
    {
      id: 'warnings',
      label: 'Warnings are resolved',
      done: audit.warningCount === 0,
      detail: audit.warningCount === 0
        ? 'Warning-bearing sections are not blocking launch confidence right now.'
        : `${audit.warningCount} warning${audit.warningCount === 1 ? '' : 's'} still need content cleanup.`,
      action: warningIssue ? getAuditAction(warningIssue) : null,
    },
    {
      id: 'desktop',
      label: 'Desktop preview checked',
      done: desktopCoverage.reviewedPageCount === desktopCoverage.totalPageCount,
      detail: getPreviewCoverageDetail(desktopCoverage, 'desktop'),
      action: desktopCoverage.reviewedPageCount === desktopCoverage.totalPageCount
        ? null
        : getPreviewReviewAction({
            device: 'desktop',
            currentDevice: previewDevice,
            currentPageId: activePageId,
            coverage: desktopCoverage,
          }),
    },
    {
      id: 'mobile',
      label: 'Mobile preview checked',
      done: mobileCoverage.reviewedPageCount === mobileCoverage.totalPageCount,
      detail: getPreviewCoverageDetail(mobileCoverage, 'mobile'),
      action: mobileCoverage.reviewedPageCount === mobileCoverage.totalPageCount
        ? null
        : getPreviewReviewAction({
            device: 'mobile',
            currentDevice: previewDevice,
            currentPageId: activePageId,
            coverage: mobileCoverage,
          }),
    },
  ];

  const keyStats = [
    `${visiblePages.length} visible page${visiblePages.length === 1 ? '' : 's'}`,
    `${visibleSections.length} visible lane${visibleSections.length === 1 ? '' : 's'}`,
    `${audit.criticalCount} critical`,
    `${audit.warningCount} warning${audit.warningCount === 1 ? '' : 's'}`,
    `${audit.watchCount} watch${audit.watchCount === 1 ? '' : 'es'}`,
  ];

  if (!visibleNonEmptySections.length || criticalIssue) {
    return {
      status: 'blocked',
      headline: !visibleNonEmptySections.length
        ? 'Launch is blocked until the document has one real visible lane'
        : `${audit.criticalCount} critical issue${audit.criticalCount === 1 ? '' : 's'} still block launch confidence`,
      detail: !visibleNonEmptySections.length
        ? 'A calm preview is not enough here. Guests still do not have a real, content-carrying page to read.'
        : 'Fix the structurally broken lane first so preview and export stop flattering an unfinished document.',
      bestNextMove: criticalIssue?.detail ?? 'Add or restore one visible section with a first content spine before you keep polishing.',
      decisionRule: 'When the visible story is empty or structurally broken, launch review stops and repair work becomes the only honest next move.',
      watchout: 'Pretty preview framing can hide the fact that launch basics are still missing.',
      keyStats,
      checklistItems,
      primaryAction: criticalIssue
        ? getAuditAction(criticalIssue)
        : getPreviewReviewAction({
            device: previewDevice,
            currentDevice: previewDevice,
            currentPageId: activePageId,
            coverage: previewReviewed[previewDevice],
          }),
    };
  }

  if (warningIssue) {
    return {
      status: 'blocked',
      headline: `${audit.warningCount} warning-bearing section${audit.warningCount === 1 ? '' : 's'} still need cleanup`,
      detail: 'The structure is mostly there, but launch truth is still softer than it should be while warnings remain in visible lanes.',
      bestNextMove: warningIssue.detail,
      decisionRule: 'When launch warnings remain, fix the exact section carrying them before you call preview good enough.',
      watchout: 'Warning-heavy sections can read “fine” from a distance while still hiding incomplete guest details.',
      keyStats,
      checklistItems,
      primaryAction: getAuditAction(warningIssue),
    };
  }

  if (desktopCoverage.reviewedPageCount !== desktopCoverage.totalPageCount) {
    return {
      status: 'review',
      headline: 'Desktop preview still needs a deliberate check',
      detail: 'Structure is stable enough to review, but launch confidence is incomplete until every visible page has a desktop pass against this exact document revision.',
      bestNextMove: desktopCoverage.nextPageTitle
        ? `Open ${desktopCoverage.nextPageTitle} on desktop, read it top to bottom, and mark it checked once the flow still feels honest.`
        : 'Read the current desktop preview top to bottom, then mark it checked once the flow still feels honest.',
      decisionRule: 'Desktop review is where page rhythm, hierarchy, and multi-page pacing get their clearest first pass.',
      watchout: 'Do not let mobile-only confidence stand in for a desktop pass when the document spans multiple guest-facing pages.',
      keyStats,
      checklistItems,
      primaryAction: getPreviewReviewAction({
        device: 'desktop',
        currentDevice: previewDevice,
        currentPageId: activePageId,
        coverage: desktopCoverage,
      }),
    };
  }

  if (mobileCoverage.reviewedPageCount !== mobileCoverage.totalPageCount) {
    return {
      status: 'review',
      headline: 'Mobile preview still needs a deliberate check',
      detail: 'The document is structurally healthy, but launch confidence is still missing the tighter screen where stacking and repetition show up fastest across the visible page set.',
      bestNextMove: mobileCoverage.nextPageTitle
        ? `Open ${mobileCoverage.nextPageTitle} on mobile, read it in one pass, and mark it checked once the guest story still holds.`
        : 'Switch to mobile preview, read the current page in one pass, and mark it checked once the guest story still holds.',
      decisionRule: 'Mobile review is the honest last gate for dense or emotionally important multi-page guest reads.',
      watchout: 'Desktop can flatter a long page that starts feeling repetitive or top-heavy on a phone.',
      keyStats,
      checklistItems,
      primaryAction: getPreviewReviewAction({
        device: 'mobile',
        currentDevice: previewDevice,
        currentPageId: activePageId,
        coverage: mobileCoverage,
      }),
    };
  }

  if (watchIssue) {
    return {
      status: 'review',
      headline: `${audit.watchCount} confidence review${audit.watchCount === 1 ? '' : 's'} still deserve a final pass`,
      detail: 'Nothing is structurally broken, and all visible pages were checked on both preview sizes, but a few pages or lanes still want an intentional confidence read.',
      bestNextMove: watchIssue.detail,
      decisionRule: 'Watch-level issues do not block structure, but they should still earn an explicit yes or no before export.',
      watchout: 'Minor review debt tends to linger because the document already feels close enough.',
      keyStats,
      checklistItems,
      primaryAction: getAuditAction(watchIssue),
    };
  }

  return {
    status: 'ready',
    headline: 'The document is in a healthy launch-review state',
    detail: 'Visible structure is carrying real content, warnings are cleared, and every visible page has been checked on both preview sizes against the current document state.',
    bestNextMove: 'Open the export handoff, then share or publish from this revision instead of reopening a speculative polish lap.',
    decisionRule: 'When the launch checklist is clean, trust the document enough to move it forward instead of searching for nervous extras.',
    watchout: 'The main risk now is reopening the draft for low-value tweaks that create fresh review debt.',
    keyStats,
    checklistItems,
    primaryAction: { kind: 'open-export', label: 'Open export handoff' },
  };
};
