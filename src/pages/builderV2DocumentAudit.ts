import { getBuilderV2FlattenedSections, type BuilderV2ReviewPageSnapshot } from './builderV2DocumentReviewState';

export type BuilderV2DocumentAuditIssue = {
  pageId: string;
  pageTitle: string;
  sectionId: string;
  sectionTitle: string;
  severity: 'critical' | 'warning' | 'watch';
  title: string;
  detail: string;
  actionLabel: string;
};

type Params = {
  pages: BuilderV2ReviewPageSnapshot[];
  previewDevice: 'desktop' | 'mobile';
};

export type BuilderV2DocumentAudit = {
  issues: BuilderV2DocumentAuditIssue[];
  criticalCount: number;
  warningCount: number;
  watchCount: number;
  headline: string;
  detail: string;
};

export const buildBuilderV2DocumentAudit = ({
  pages,
  previewDevice,
}: Params): BuilderV2DocumentAudit => {
  const issues: BuilderV2DocumentAuditIssue[] = [];
  const flattenedSections = getBuilderV2FlattenedSections(pages);
  const visibleSections = flattenedSections.filter((section) => section.enabled);

  for (const page of pages) {
    if (page.hidden) {
      issues.push({
        pageId: page.id,
        pageTitle: page.title,
        sectionId: page.sections[0]?.id ?? page.id,
        sectionTitle: page.sections[0]?.title ?? page.title,
        severity: 'watch',
        title: `${page.title} is hidden from the visible site map`,
        detail: 'Make sure this page is intentionally parked and not just forgotten outside the current guest flow.',
        actionLabel: 'Review hidden page',
      });
    }

    for (const section of page.sections) {
      const isVisible = !page.hidden && section.enabled;

      if (!isVisible) {
        if (!page.hidden) {
          issues.push({
            pageId: page.id,
            pageTitle: page.title,
            sectionId: section.id,
            sectionTitle: section.title,
            severity: 'watch',
            title: `${section.title} is hidden from ${page.title}`,
            detail: 'Make sure this lane is intentionally parked and not just forgotten outside the preview.',
            actionLabel: 'Review hidden lane',
          });
        }
        continue;
      }

      if (section.blockCount === 0) {
        issues.push({
          pageId: page.id,
          pageTitle: page.title,
          sectionId: section.id,
          sectionTitle: section.title,
          severity: 'critical',
          title: `${section.title} has no content blocks`,
          detail: `${page.title} will hand off with an empty visible shell until this lane gets its first content spine.`,
          actionLabel: 'Add first blocks',
        });
        continue;
      }

      if (section.warningCount > 0) {
        issues.push({
          pageId: page.id,
          pageTitle: page.title,
          sectionId: section.id,
          sectionTitle: section.title,
          severity: 'warning',
          title: `${section.title} still carries ${section.warningCount} warning${section.warningCount === 1 ? '' : 's'}`,
          detail: `Resolve the incomplete block data so ${page.title} stays truthful when this document leaves the lab.`,
          actionLabel: 'Resolve warnings',
        });
        continue;
      }

      if (previewDevice !== 'mobile' && section.blockCount >= 8) {
        issues.push({
          pageId: page.id,
          pageTitle: page.title,
          sectionId: section.id,
          sectionTitle: section.title,
          severity: 'watch',
          title: `${section.title} is dense enough to deserve a mobile check`,
          detail: `${page.title} may still feel flattering on desktop if this lane is long or tightly packed.`,
          actionLabel: 'Review on mobile',
        });
      }
    }
  }

  const criticalCount = issues.filter((issue) => issue.severity === 'critical').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
  const watchCount = issues.filter((issue) => issue.severity === 'watch').length;

  if (!issues.length) {
    return {
      issues,
      criticalCount,
      warningCount,
      watchCount,
      headline: 'No active handoff issues',
      detail: `All ${visibleSections.length} visible section${visibleSections.length === 1 ? '' : 's'} are carrying stable structure right now.`,
    };
  }

  if (criticalCount > 0) {
    return {
      issues,
      criticalCount,
      warningCount,
      watchCount,
      headline: `${criticalCount} critical handoff issue${criticalCount === 1 ? '' : 's'} need structure repair first`,
      detail: 'Fix the empty or structurally broken lanes before you trust the exported document.',
    };
  }

  if (warningCount > 0) {
    return {
      issues,
      criticalCount,
      warningCount,
      watchCount,
      headline: `${warningCount} visible section${warningCount === 1 ? '' : 's'} still need content cleanup`,
      detail: 'The layout is mostly there, but warning-bearing sections still want one more truth pass.',
    };
  }

  return {
    issues,
    criticalCount,
    warningCount,
    watchCount,
    headline: `${watchCount} page or section review${watchCount === 1 ? '' : 's'} still deserve a confidence pass`,
    detail: 'Nothing is structurally broken, but a few pages or lanes still want an intentional review before handoff.',
  };
};
