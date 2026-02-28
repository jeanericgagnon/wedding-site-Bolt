import type { BuilderProject } from '../../types/builder/project';
import type { WeddingDataV1 } from '../../types/weddingData';

export type PublishIssue =
  | { kind: 'no-pages'; message: string }
  | { kind: 'no-enabled-sections'; message: string; firstSectionId?: string; firstPageId?: string }
  | { kind: 'missing-couple-names'; message: string }
  | { kind: 'missing-event-date'; message: string }
  | { kind: 'missing-venue'; message: string }
  | { kind: 'rsvp-disabled'; message: string };

export const getPublishIssue = (project: BuilderProject, weddingData?: WeddingDataV1 | null): PublishIssue | null => {
  if (!project.pages.length) {
    return { kind: 'no-pages', message: 'Add at least one page before publishing.' };
  }

  const firstSection = project.pages.flatMap((p) => p.sections.map((s) => ({ pageId: p.id, sectionId: s.id })))[0];
  const hasEnabledSection = project.pages.some((page) => page.sections.some((section) => section.enabled));
  if (!hasEnabledSection) {
    return {
      kind: 'no-enabled-sections',
      message: 'Enable at least one section before publishing.',
      firstSectionId: firstSection?.sectionId,
      firstPageId: firstSection?.pageId,
    };
  }

  if (weddingData) {
    const hasPartner1 = !!weddingData.couple.partner1Name?.trim();
    const hasPartner2 = !!weddingData.couple.partner2Name?.trim();
    if (!hasPartner1 || !hasPartner2) {
      return { kind: 'missing-couple-names', message: 'Add both partner names before publishing.' };
    }

    if (!weddingData.event.weddingDateISO) {
      return { kind: 'missing-event-date', message: 'Add your wedding date before publishing.' };
    }

    const hasVenue = weddingData.venues.some((v) => !!v.name?.trim() || !!v.address?.trim());
    if (!hasVenue) {
      return { kind: 'missing-venue', message: 'Add at least one venue before publishing.' };
    }

    if (!weddingData.rsvp.enabled) {
      return { kind: 'rsvp-disabled', message: 'Enable RSVP before publishing.' };
    }
  }

  return null;
};

export const getPublishValidationError = (project: BuilderProject, weddingData?: WeddingDataV1 | null): string | null =>
  getPublishIssue(project, weddingData)?.message ?? null;
