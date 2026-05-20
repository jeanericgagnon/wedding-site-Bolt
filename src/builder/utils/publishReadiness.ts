import type { BuilderProject } from '../../types/builder/project';
import type { WeddingDataV1 } from '../../types/weddingData';

export type PublishIssue =
  | { kind: 'no-pages'; message: string }
  | { kind: 'no-enabled-sections'; message: string; firstSectionId?: string; firstPageId?: string }
  | { kind: 'missing-couple-names'; message: string }
  | { kind: 'missing-event-date'; message: string }
  | { kind: 'missing-venue'; message: string }
  | { kind: 'rsvp-disabled'; message: string }
  | { kind: 'unsaved-changes'; message: string };

export interface PublishReadinessItem {
  id: string;
  label: string;
  done: boolean;
  detail: string;
}

export interface PublishIssueOptions {
  isDirty?: boolean;
}

const hasNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const getNormalizedId = (value: unknown) => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};
const isPageLike = (value: unknown): value is BuilderProject['pages'][number] =>
  typeof value === 'object'
  && value !== null
  && !Array.isArray(value)
  && getNormalizedId((value as { id?: unknown }).id).length > 0;
const getComparableOrderIndex = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return Number.MAX_SAFE_INTEGER;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.MAX_SAFE_INTEGER;
};
const getNormalizedPages = (project: BuilderProject) =>
  (Array.isArray(project.pages) ? project.pages.filter(isPageLike) : []).sort((a, b) => {
    const orderDelta = getComparableOrderIndex(a?.orderIndex) - getComparableOrderIndex(b?.orderIndex);
    if (orderDelta !== 0) return orderDelta;
    return getPageTitle(a).localeCompare(getPageTitle(b)) || getNormalizedId(a?.id).localeCompare(getNormalizedId(b?.id));
  });
const getPageId = (page: BuilderProject['pages'][number] | undefined) => getNormalizedId(page?.id);
const getPageTitle = (page: BuilderProject['pages'][number] | undefined) =>
  typeof page?.title === 'string' ? page.title.trim() : '';
const getPageTitleForSentence = (page: BuilderProject['pages'][number] | undefined) => {
  const title = getPageTitle(page).replace(/[.,:;!?]+$/g, '').trim();
  return title || 'the current page';
};
const getSectionId = (section: NonNullable<BuilderProject['pages'][number]>['sections'][number] | undefined) =>
  getNormalizedId(section?.id);
const getSectionTitle = (section: NonNullable<BuilderProject['pages'][number]>['sections'][number] | undefined) =>
  typeof section?.displayName === 'string' ? section.displayName.trim() : '';
const isSectionLike = (value: unknown): value is NonNullable<BuilderProject['pages'][number]>['sections'][number] =>
  typeof value === 'object'
  && value !== null
  && !Array.isArray(value)
  && getNormalizedId((value as { id?: unknown }).id).length > 0;
const getNormalizedSections = (page: BuilderProject['pages'][number] | undefined) =>
  (Array.isArray(page?.sections) ? page.sections.filter(isSectionLike) : []).sort((a, b) => {
    const orderDelta = getComparableOrderIndex(a?.orderIndex) - getComparableOrderIndex(b?.orderIndex);
    if (orderDelta !== 0) return orderDelta;
    return getSectionTitle(a).localeCompare(getSectionTitle(b)) || getNormalizedId(a?.id).localeCompare(getNormalizedId(b?.id));
  });
const isVenueLike = (value: unknown): value is NonNullable<WeddingDataV1['venues']>[number] =>
  typeof value === 'object'
  && value !== null
  && !Array.isArray(value)
  && getNormalizedId((value as { id?: unknown }).id).length > 0;
const getVenueTitle = (venue: NonNullable<WeddingDataV1['venues']>[number]) =>
  hasNonEmptyString((venue as { name?: unknown }).name) ? (venue.name ?? '').trim() : '';
const getSortedNormalizedVenues = (weddingData?: WeddingDataV1 | null) =>
  getNormalizedVenues(weddingData).sort((a, b) => {
    const orderDelta = getComparableOrderIndex((a as { orderIndex?: unknown }).orderIndex)
      - getComparableOrderIndex((b as { orderIndex?: unknown }).orderIndex);
    if (orderDelta !== 0) return orderDelta;
    return getVenueTitle(a).localeCompare(getVenueTitle(b))
      || getNormalizedId((a as { id?: unknown }).id).localeCompare(getNormalizedId((b as { id?: unknown }).id));
  });
const getNormalizedVenues = (weddingData?: WeddingDataV1 | null) =>
  (Array.isArray(weddingData?.venues) ? weddingData.venues.filter(isVenueLike) : []);

export const getPublishIssue = (
  project: BuilderProject,
  weddingData?: WeddingDataV1 | null,
  options?: PublishIssueOptions,
): PublishIssue | null => {
  const normalizedPages = getNormalizedPages(project);

  if (!normalizedPages.length) {
    return { kind: 'no-pages', message: 'Add at least one page before going live.' };
  }

  const firstSection = normalizedPages.flatMap((p) =>
    getNormalizedSections(p).map((s) => ({ pageId: getPageId(p), sectionId: getSectionId(s) }))
  )[0];
  const hasEnabledSection = normalizedPages.some((page) => getNormalizedSections(page).some((section) => section?.enabled === true));
  if (!hasEnabledSection) {
    return {
      kind: 'no-enabled-sections',
      message: 'Turn on at least one section before going live.',
      firstSectionId: firstSection?.sectionId,
      firstPageId: firstSection?.pageId,
    };
  }

  if (weddingData) {
    const couple = typeof weddingData.couple === 'object' && weddingData.couple !== null ? weddingData.couple : undefined;
    const event = typeof weddingData.event === 'object' && weddingData.event !== null ? weddingData.event : undefined;
    const rsvp = typeof weddingData.rsvp === 'object' && weddingData.rsvp !== null ? weddingData.rsvp : undefined;
    const hasPartner1 = hasNonEmptyString(couple?.partner1Name);
    const hasPartner2 = hasNonEmptyString(couple?.partner2Name);
    if (!hasPartner1 || !hasPartner2) {
      return { kind: 'missing-couple-names', message: 'Add both names exactly how you want them shown before going live.' };
    }

    if (!hasNonEmptyString(event?.weddingDateISO)) {
      return { kind: 'missing-event-date', message: 'Add your wedding date before going live.' };
    }

    const hasVenue = getSortedNormalizedVenues(weddingData).some((v) => hasNonEmptyString(v?.name) || hasNonEmptyString(v?.address));
    if (!hasVenue) {
      return { kind: 'missing-venue', message: 'Add at least one venue name or address before going live.' };
    }

    if (rsvp?.enabled !== true) {
      return { kind: 'rsvp-disabled', message: 'Turn RSVP on before going live.' };
    }
  }

  if (options?.isDirty === true) {
    return { kind: 'unsaved-changes', message: 'Save your latest draft changes before going live.' };
  }

  return null;
};

export const getPublishValidationError = (
  project: BuilderProject,
  weddingData?: WeddingDataV1 | null,
  options?: PublishIssueOptions,
): string | null =>
  getPublishIssue(project, weddingData, options)?.message ?? null;

export const buildPublishReadiness = (
  project: BuilderProject,
  weddingData?: WeddingDataV1 | null,
  options?: { isDirty?: boolean; activePageId?: string | null }
): PublishReadinessItem[] => {
  const normalizedActivePageId = getNormalizedId(options?.activePageId) || null;
  const normalizedPages = getNormalizedPages(project);
  const activePage = normalizedPages.find((page) => getPageId(page) === normalizedActivePageId) ?? normalizedPages[0];
  const enabledSectionCount = normalizedPages.reduce(
    (count, page) => count + getNormalizedSections(page).filter((section) => section?.enabled === true).length,
    0
  );
  const couple = typeof weddingData?.couple === 'object' && weddingData.couple !== null ? weddingData.couple : undefined;
  const event = typeof weddingData?.event === 'object' && weddingData.event !== null ? weddingData.event : undefined;
  const rsvp = typeof weddingData?.rsvp === 'object' && weddingData.rsvp !== null ? weddingData.rsvp : undefined;
  const hasVenue = getSortedNormalizedVenues(weddingData).some((v) => hasNonEmptyString(v?.name) || hasNonEmptyString(v?.address));
  const hasNames = hasNonEmptyString(couple?.partner1Name) && hasNonEmptyString(couple?.partner2Name);
  const hasWeddingDate = hasNonEmptyString(event?.weddingDateISO);
  const hasRsvpEnabled = weddingData ? rsvp?.enabled === true : true;
  const hasUnsavedChanges = options?.isDirty === true;
  const activePageHasVisibleSections = getNormalizedSections(activePage).some((section) => section?.enabled === true);
  const activePageTitle = getPageTitleForSentence(activePage);

  return [
    {
      id: 'page',
      label: 'A page exists',
      done: normalizedPages.length > 0,
      detail: normalizedPages.length > 0
        ? `${normalizedPages.length} page${normalizedPages.length === 1 ? '' : 's'} ready`
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
