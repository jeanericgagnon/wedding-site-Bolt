export type BuilderV2DocumentAuditIssue = {
  sectionId: string;
  sectionTitle: string;
  severity: 'critical' | 'warning' | 'watch';
  title: string;
  detail: string;
  actionLabel: string;
};

type SectionSnapshot = {
  id: string;
  title: string;
  enabled: boolean;
  blockCount: number;
  warningCount: number;
};

type Params = {
  sections: SectionSnapshot[];
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
  sections,
  previewDevice,
}: Params): BuilderV2DocumentAudit => {
  const issues: BuilderV2DocumentAuditIssue[] = [];
  const visibleSections = sections.filter((section) => section.enabled);

  for (const section of sections) {
    if (!section.enabled) {
      issues.push({
        sectionId: section.id,
        sectionTitle: section.title,
        severity: 'watch',
        title: `${section.title} is hidden from the live page`,
        detail: 'Make sure this lane is intentionally parked and not just forgotten outside the preview.',
        actionLabel: 'Review hidden lane',
      });
      continue;
    }

    if (section.blockCount === 0) {
      issues.push({
        sectionId: section.id,
        sectionTitle: section.title,
        severity: 'critical',
        title: `${section.title} has no content blocks`,
        detail: 'This section will hand off as an empty shell until it has a first content spine.',
        actionLabel: 'Add first blocks',
      });
      continue;
    }

    if (section.warningCount > 0) {
      issues.push({
        sectionId: section.id,
        sectionTitle: section.title,
        severity: 'warning',
        title: `${section.title} still carries ${section.warningCount} warning${section.warningCount === 1 ? '' : 's'}`,
        detail: 'Resolve the incomplete block data so the exported document stays truthful outside the lab.',
        actionLabel: 'Resolve warnings',
      });
      continue;
    }

    if (previewDevice !== 'mobile' && section.blockCount >= 8) {
      issues.push({
        sectionId: section.id,
        sectionTitle: section.title,
        severity: 'watch',
        title: `${section.title} is dense enough to deserve a mobile check`,
        detail: 'Desktop preview may still be flattering this lane if the section is long or tightly packed.',
        actionLabel: 'Review on mobile',
      });
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
    headline: `${watchCount} section${watchCount === 1 ? '' : 's'} deserve a last confidence check`,
    detail: 'Nothing is structurally broken, but a few lanes still want an intentional review before handoff.',
  };
};
