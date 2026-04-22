import type { BuilderProject } from '../../types/builder/project';
import type { WeddingDataV1 } from '../../types/weddingData';

export type PublishIssue =
  | { kind: 'no-pages'; message: string }
  | { kind: 'no-enabled-sections'; message: string; firstSectionId?: string; firstPageId?: string }
  | { kind: 'missing-couple-names'; message: string }
  | { kind: 'missing-event-date'; message: string }
  | { kind: 'missing-venue'; message: string }
  | { kind: 'rsvp-disabled'; message: string };

export interface PublishReadinessItem {
  id: string;
  label: string;
  done: boolean;
  detail: string;
}

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

    if (!weddingData.event.weddingDateISO?.trim()) {
      return { kind: 'missing-event-date', message: 'Add your wedding date before going live.' };
    }

    const hasVenue = Boolean(weddingData.venues?.some((v) => !!v.name?.trim() || !!v.address?.trim()));
    if (!hasVenue) {
      return { kind: 'missing-venue', message: 'Add at least one venue before going live.' };
    }

    if (!weddingData.rsvp?.enabled) {
      return { kind: 'rsvp-disabled', message: 'Turn RSVP on before going live.' };
    }
  }

  return null;
};

export const getPublishValidationError = (project: BuilderProject, weddingData?: WeddingDataV1 | null): string | null =>
  getPublishIssue(project, weddingData)?.message ?? null;

export const buildPublishReadiness = (
  project: BuilderProject,
  weddingData?: WeddingDataV1 | null,
  options?: { isDirty?: boolean; activePageId?: string | null }
): PublishReadinessItem[] => {
  const activePage = project.pages.find((page) => page.id === options?.activePageId) ?? project.pages[0];
  const enabledSectionCount = project.pages.reduce(
    (count, page) => count + page.sections.filter((section) => section.enabled).length,
    0
  );
  const hasVenue = Boolean(weddingData?.venues?.some((v) => !!v.name?.trim() || !!v.address?.trim()));
  const hasNames = Boolean(weddingData?.couple?.partner1Name?.trim() && weddingData?.couple?.partner2Name?.trim());
  const hasWeddingDate = Boolean(weddingData?.event.weddingDateISO?.trim());
  const hasRsvpEnabled = weddingData ? Boolean(weddingData.rsvp?.enabled) : true;
  const hasUnsavedChanges = Boolean(options?.isDirty);
  const activePageHasVisibleSections = Boolean(activePage?.sections.some((section) => section.enabled));
  const activePageTitle = activePage?.title?.trim() || 'the current page';

  return [
    {
      id: 'page',
      label: 'A page exists',
      done: project.pages.length > 0,
      detail: project.pages.length > 0
        ? `${project.pages.length} page${project.pages.length === 1 ? '' : 's'} ready`
        : 'Add a page or apply a starting design.',
    },
    {
      id: 'sections',
      label: 'At least one section is turned on',
      done: enabledSectionCount > 0,
      detail: enabledSectionCount > 0 ? `${enabledSectionCount} section${enabledSectionCount === 1 ? '' : 's'} visible` : 'Turn on a section before going live.',
    },
    {
      id: 'names',
      label: 'Couple names are filled in',
      done: hasNames,
      detail: hasNames ? 'Names are ready for guests.' : 'Add both names exactly how you want them shown.',
    },
    {
      id: 'date',
      label: 'Wedding date is set',
      done: hasWeddingDate,
      detail: hasWeddingDate ? 'Date is ready.' : 'Add your wedding date.',
    },
    {
      id: 'venue',
      label: 'Venue details are set',
      done: hasVenue,
      detail: hasVenue ? 'Venue details are ready.' : 'Add at least one venue name or address.',
    },
    {
      id: 'rsvp',
      label: 'RSVP is turned on',
      done: hasRsvpEnabled,
      detail: hasRsvpEnabled ? 'Guests can reply.' : 'Turn RSVP on or remove RSVP calls to action.',
    },
    {
      id: 'saved',
      label: 'Latest edits are saved',
      done: !hasUnsavedChanges,
      detail: hasUnsavedChanges ? 'Save your latest draft changes before going live.' : 'Everything is saved.',
    },
    {
      id: 'current-page',
      label: 'Current page has visible content',
      done: activePageHasVisibleSections,
      detail: activePageHasVisibleSections
        ? `${activePageTitle === 'the current page' ? 'Current page' : activePageTitle} has visible sections.`
        : `Turn on content for ${activePageTitle}.`,
    },
  ];
};
