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
    return { kind: 'no-pages', message: 'Add at least one page before going live.' };
  }

  const firstSection = project.pages.flatMap((p) => p.sections.map((s) => ({ pageId: p.id, sectionId: s.id })))[0];
  const hasEnabledSection = project.pages.some((page) => page.sections.some((section) => section.enabled));
  if (!hasEnabledSection) {
    return {
      kind: 'no-enabled-sections',
      message: 'Turn on at least one section before going live.',
      firstSectionId: firstSection?.sectionId,
      firstPageId: firstSection?.pageId,
    };
  }

  if (weddingData) {
    const hasPartner1 = !!weddingData.couple.partner1Name?.trim();
    const hasPartner2 = !!weddingData.couple.partner2Name?.trim();
    if (!hasPartner1 || !hasPartner2) {
      return { kind: 'missing-couple-names', message: 'Add both partner names before going live.' };
    }

    if (!weddingData.event.weddingDateISO) {
      return { kind: 'missing-event-date', message: 'Add your wedding date before going live.' };
    }

    const hasVenue = weddingData.venues.some((v) => !!v.name?.trim() || !!v.address?.trim());
    if (!hasVenue) {
      return { kind: 'missing-venue', message: 'Add at least one venue before going live.' };
    }

    if (!weddingData.rsvp.enabled) {
      return { kind: 'rsvp-disabled', message: 'Turn RSVP on before going live.' };
    }
  }

  return null;
};

export const getPublishValidationError = (project: BuilderProject, weddingData?: WeddingDataV1 | null): string | null =>
  getPublishIssue(project, weddingData)?.message ?? null;
