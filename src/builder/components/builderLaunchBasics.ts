import type { WeddingDataV1 } from '../../types/weddingData';

type LaunchBasicsIssueKind =
  | 'missing-couple-names'
  | 'missing-event-date'
  | 'missing-venue'
  | 'rsvp-disabled'
  | null;

export interface BuilderLaunchBasicsDraft {
  partner1Name: string;
  partner2Name: string;
  weddingDate: string;
  venueName: string;
  venueAddress: string;
  rsvpEnabled: boolean;
}

export interface BuilderLaunchBasicsSummary {
  completedCount: number;
  totalCount: number;
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  suggestedField: keyof BuilderLaunchBasicsDraft;
  items: Array<{
    id: 'names' | 'date' | 'venue' | 'rsvp';
    label: string;
    done: boolean;
    detail: string;
  }>;
}

function normalizeDateInput(value?: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.slice(0, 10);
}

function getAutoDisplayName(partner1Name: string, partner2Name: string): string {
  const first = partner1Name.trim();
  const second = partner2Name.trim();
  if (first && second) return `${first} & ${second}`;
  return first || second;
}

function shouldRefreshDisplayName(currentDisplayName: string | undefined, previousAutoDisplayName: string): boolean {
  const current = currentDisplayName?.trim() ?? '';
  if (!current) return true;
  return current === previousAutoDisplayName;
}

export function createBuilderLaunchBasicsDraft(weddingData: WeddingDataV1 | null | undefined): BuilderLaunchBasicsDraft {
  const venue = weddingData?.venues?.[0];
  return {
    partner1Name: weddingData?.couple.partner1Name ?? '',
    partner2Name: weddingData?.couple.partner2Name ?? '',
    weddingDate: normalizeDateInput(weddingData?.event.weddingDateISO),
    venueName: venue?.name ?? '',
    venueAddress: venue?.address ?? '',
    rsvpEnabled: weddingData?.rsvp.enabled ?? true,
  };
}

export function applyBuilderLaunchBasicsDraft(
  weddingData: WeddingDataV1,
  draft: BuilderLaunchBasicsDraft,
): WeddingDataV1 {
  const nextPartner1 = draft.partner1Name.trim();
  const nextPartner2 = draft.partner2Name.trim();
  const nextVenueName = draft.venueName.trim();
  const nextVenueAddress = draft.venueAddress.trim();
  const oldAutoDisplayName = getAutoDisplayName(
    weddingData.couple.partner1Name ?? '',
    weddingData.couple.partner2Name ?? '',
  );
  const nextAutoDisplayName = getAutoDisplayName(nextPartner1, nextPartner2);
  const existingDateSuffix = (weddingData.event.weddingDateISO ?? '').slice(10);
  const nextWeddingDateISO = draft.weddingDate
    ? `${draft.weddingDate}${existingDateSuffix}`
    : undefined;
  const existingVenue = weddingData.venues[0];
  const keepVenue = nextVenueName || nextVenueAddress;
  const nextVenues = keepVenue
    ? [
        {
          ...existingVenue,
          id: existingVenue?.id ?? `venue_${Date.now()}`,
          name: nextVenueName || undefined,
          address: nextVenueAddress || undefined,
        },
        ...weddingData.venues.slice(1),
      ]
    : weddingData.venues.slice(1);

  return {
    ...weddingData,
    couple: {
      ...weddingData.couple,
      partner1Name: nextPartner1,
      partner2Name: nextPartner2,
      displayName: shouldRefreshDisplayName(weddingData.couple.displayName, oldAutoDisplayName)
        ? nextAutoDisplayName || undefined
        : weddingData.couple.displayName,
    },
    event: {
      ...weddingData.event,
      weddingDateISO: nextWeddingDateISO,
    },
    venues: nextVenues,
    rsvp: {
      ...weddingData.rsvp,
      enabled: draft.rsvpEnabled,
    },
    meta: {
      ...weddingData.meta,
      updatedAtISO: new Date().toISOString(),
    },
  };
}

export function getBuilderLaunchBasicsSummary(
  draft: BuilderLaunchBasicsDraft,
  issueKind: LaunchBasicsIssueKind = null,
): BuilderLaunchBasicsSummary {
  const items: BuilderLaunchBasicsSummary['items'] = [
    {
      id: 'names',
      label: 'Couple names',
      done: draft.partner1Name.trim().length > 0 && draft.partner2Name.trim().length > 0,
      detail:
        draft.partner1Name.trim().length > 0 && draft.partner2Name.trim().length > 0
          ? 'Guest-facing names are set.'
          : 'Add both names exactly how guests should see them.',
    },
    {
      id: 'date',
      label: 'Wedding date',
      done: draft.weddingDate.trim().length > 0,
      detail: draft.weddingDate.trim().length > 0 ? 'Date is set.' : 'Add the actual wedding date.',
    },
    {
      id: 'venue',
      label: 'Venue basics',
      done: draft.venueName.trim().length > 0 || draft.venueAddress.trim().length > 0,
      detail:
        draft.venueName.trim().length > 0 || draft.venueAddress.trim().length > 0
          ? 'Guests have a location anchor.'
          : 'Add at least one venue name or address.',
    },
    {
      id: 'rsvp',
      label: 'RSVP availability',
      done: draft.rsvpEnabled,
      detail: draft.rsvpEnabled ? 'Guests can reply.' : 'Turn RSVP on before launch.',
    },
  ];
  const completedCount = items.filter((item) => item.done).length;
  const totalCount = items.length;

  switch (issueKind) {
    case 'missing-couple-names':
      return {
        completedCount,
        totalCount,
        focusTitle: 'Set the names before you polish anything else.',
        focusDetail: 'The couple names are part of the first trust read. Guests should not see placeholder-level identity at launch.',
        bestNextMove: 'Fill in both names exactly as you want them shown across the shared site.',
        decisionRule: 'When identity copy is still unresolved, finish that before you judge layout, theme, or section polish.',
        watchout: 'A refined page still feels unfinished if the names are thin or mismatched.',
        suggestedField: 'partner1Name',
        items,
      };
    case 'missing-event-date':
      return {
        completedCount,
        totalCount,
        focusTitle: 'Anchor the date before you ask guests to trust the draft.',
        focusDetail: 'Without the wedding date, the site may look polished while still failing the most basic guest question.',
        bestNextMove: 'Add the actual wedding date, then re-check how the key sections read around it.',
        decisionRule: 'When timing is still missing, clarity beats every other visual improvement.',
        watchout: 'A draft can feel almost ready while still leaving guests unsure what day the event is on.',
        suggestedField: 'weddingDate',
        items,
      };
    case 'missing-venue':
      return {
        completedCount,
        totalCount,
        focusTitle: 'Give the day a location anchor before launch.',
        focusDetail: 'Guests need one real place reference to trust the schedule, travel notes, and RSVP path.',
        bestNextMove: 'Add the main venue name or address so the site stops feeling location-thin.',
        decisionRule: 'One trustworthy location anchor is more valuable than a wider pass of cosmetic cleanup.',
        watchout: 'If place information is missing, every surrounding section starts to feel more tentative than it really is.',
        suggestedField: 'venueName',
        items,
      };
    case 'rsvp-disabled':
      return {
        completedCount,
        totalCount,
        focusTitle: 'Align the invitation path with the actual guest behavior.',
        focusDetail: 'If RSVP is off while the site still implies guests can respond, trust drops fast.',
        bestNextMove: 'Turn RSVP on before you publish, or make a deliberate off-site reply plan instead of drifting into one.',
        decisionRule: 'If the site is the guest action surface, the reply path should be ready before launch.',
        watchout: 'Guests notice promise-to-action mismatches much faster than they notice visual craft.',
        suggestedField: 'rsvpEnabled',
        items,
      };
    default:
      return {
        completedCount,
        totalCount,
        focusTitle: completedCount === totalCount
          ? 'The launch basics are in a healthy place.'
          : 'Use this lane to close the quiet gaps before sharing with guests.',
        focusDetail: completedCount === totalCount
          ? 'Names, date, venue, and RSVP are all set, so the remaining questions are about page quality rather than missing fundamentals.'
          : 'These are the few draft-level facts that most directly shape whether the site feels trustworthy on first read.',
        bestNextMove: completedCount === totalCount
          ? 'Leave the basics alone unless the guest-facing truth has actually changed.'
          : 'Finish the missing basics here before reopening a wider polish loop.',
        decisionRule: completedCount === totalCount
          ? 'Once the foundation is complete, protect it and spend your energy on the surfaces that still have real gaps.'
          : 'When the foundation is still incomplete, closing that truth gap beats almost any visual refinement.',
        watchout: completedCount === totalCount
          ? 'Do not keep reopening stable basics just because they are easy to edit.'
          : 'A nearly-finished page can hide the fact that the site still lacks one of its most important guest-facing facts.',
        suggestedField: items.find((item) => !item.done)?.id === 'date'
          ? 'weddingDate'
          : items.find((item) => !item.done)?.id === 'venue'
            ? 'venueName'
            : items.find((item) => !item.done)?.id === 'rsvp'
              ? 'rsvpEnabled'
              : 'partner1Name',
        items,
      };
  }
}
