import { appendGuestInviteTokenToInternalHref } from './publicAccessArtifacts';
import { appendGuestLanguageToInternalHref } from './guestLanguagePreference';
import { getSafePublicActionHref, getSafePublicMapsUrl } from '../sections/publicLinks';
import type { GuestHubActionId } from './guestHubActions';
import { normalizeTravelPortalData } from './travelStructuredData';

export type TravelGuestPortalStepId =
  | 'arrival'
  | 'lodging'
  | 'transport'
  | 'venues'
  | 'schedule'
  | 'local-context'
  | 'guest-specific';

export type TravelGuestPortalStatus = 'ready' | 'needs-info' | 'empty' | 'planned';

export interface TravelGuestPortalInput {
  flightInfo?: string | null;
  hotelInfo?: string | null;
  parkingInfo?: string | null;
  notes?: string | null;
  hotelCount?: number;
  roomBlockCount?: number;
  shuttleCount?: number;
  visaTipCount?: number;
  culturalTipCount?: number;
  venueCount: number;
  venueAddressCount: number;
  scheduleCount: number;
  eventInviteScoped: boolean;
}

export interface TravelGuestPortalStep {
  id: TravelGuestPortalStepId;
  label: string;
  detail: string;
  status: TravelGuestPortalStatus;
}

export interface TravelGuestPortalReadiness {
  readyCount: number;
  steps: TravelGuestPortalStep[];
  blockers: string[];
}

export type TravelGuestJourneyStepId = 'travel' | 'rsvp' | 'photos';

export interface TravelGuestJourneyStep {
  id: TravelGuestJourneyStepId;
  label: string;
  detail: string;
  href: string;
  status: 'ready' | 'needs-info';
}

export interface TravelGuestJourneyInput {
  siteSlug: string;
  enabledActionIds: GuestHubActionId[];
  guestInviteToken?: string | null;
  guestLanguage?: string | null;
}

export interface TravelVenueMapInput {
  id: string;
  label: string;
  address?: string | null;
  mapUrl?: string | null;
}

export interface TravelVenueMapLink {
  id: string;
  label: string;
  href: string;
}

export interface TravelHubSpotlightCard {
  id: string;
  label: string;
  detail: string;
  href?: string;
}

export interface TravelHubSpotlight {
  summary: string;
  travelHref: string;
  cards: TravelHubSpotlightCard[];
  shareText: string;
  htmlDocument: string;
  filename: string;
}

const hasUsefulText = (value: string | null | undefined, minLength = 8) => Boolean(value && value.trim().length >= minLength);
const hasAction = (actionIds: GuestHubActionId[], id: GuestHubActionId) => actionIds.includes(id);

export function buildTravelGuestPortalReadiness(input: TravelGuestPortalInput): TravelGuestPortalReadiness {
  const hotelCount = input.hotelCount ?? 0;
  const roomBlockCount = input.roomBlockCount ?? 0;
  const shuttleCount = input.shuttleCount ?? 0;
  const visaTipCount = input.visaTipCount ?? 0;
  const culturalTipCount = input.culturalTipCount ?? 0;
  const hasArrival = hasUsefulText(input.flightInfo);
  const hasLodging = hasUsefulText(input.hotelInfo) || hotelCount > 0 || roomBlockCount > 0;
  const hasTransport = hasUsefulText(input.parkingInfo) || shuttleCount > 0;
  const hasLocalContext = hasUsefulText(input.notes) || visaTipCount > 0 || culturalTipCount > 0;
  const hasVenues = input.venueCount > 0;
  const venuesAddressed = hasVenues && input.venueAddressCount >= input.venueCount;
  const hasSchedule = input.scheduleCount > 0;
  const hasStructuredGuestGuidance = roomBlockCount > 0 || shuttleCount > 0 || visaTipCount > 0 || culturalTipCount > 0;

  const steps: TravelGuestPortalStep[] = [
    {
      id: 'arrival',
      label: 'Arrival guidance',
      detail: hasArrival ? 'Airport, train, or arrival guidance is written for guests.' : 'Add airport, train, shuttle, or arrival guidance.',
      status: hasArrival ? 'ready' : 'needs-info',
    },
    {
      id: 'lodging',
      label: 'Lodging',
      detail: hasLodging
        ? roomBlockCount > 0
          ? `${Math.max(hotelCount, 1)} hotel option${Math.max(hotelCount, 1) === 1 ? '' : 's'} and ${roomBlockCount} room block${roomBlockCount === 1 ? '' : 's'} are ready for guests.`
          : hotelCount > 0
            ? `${hotelCount} structured hotel option${hotelCount === 1 ? '' : 's'} are ready for guests.`
            : 'Hotel or room-block guidance is ready.'
        : 'Add hotel, room block, or where-to-stay guidance.',
      status: hasLodging ? 'ready' : 'needs-info',
    },
    {
      id: 'transport',
      label: 'Local transport',
      detail: hasTransport
        ? shuttleCount > 0
          ? `${shuttleCount} shuttle plan${shuttleCount === 1 ? '' : 's'} plus local transport details are ready.`
          : 'Parking, shuttle, or local transport details are ready.'
        : 'Add parking, shuttle, rideshare, or local transport guidance.',
      status: hasTransport ? 'ready' : 'needs-info',
    },
    {
      id: 'venues',
      label: 'Venue addresses',
      detail: venuesAddressed
        ? `${input.venueAddressCount} of ${input.venueCount} venues have addresses.`
        : hasVenues
          ? `${Math.max(input.venueCount - input.venueAddressCount, 0)} venue address${input.venueCount - input.venueAddressCount === 1 ? '' : 'es'} still missing.`
          : 'Add at least one venue before travel routing can feel complete.',
      status: venuesAddressed ? 'ready' : hasVenues ? 'needs-info' : 'empty',
    },
    {
      id: 'schedule',
      label: 'Weekend schedule',
      detail: hasSchedule ? `${input.scheduleCount} schedule item${input.scheduleCount === 1 ? '' : 's'} can guide travel timing.` : 'Add schedule items so guests know when travel details matter.',
      status: hasSchedule ? 'ready' : 'empty',
    },
    {
      id: 'local-context',
      label: 'Local context',
      detail: hasLocalContext
        ? visaTipCount > 0 || culturalTipCount > 0
          ? `${visaTipCount > 0 ? `${visaTipCount} visa` : 'No visa'} and ${culturalTipCount} local-tip note${culturalTipCount === 1 ? '' : 's'} are ready for guests.`
          : 'Local notes or cultural context are ready.'
        : 'Add local recommendations, dress/weather context, or destination notes if guests need them.',
      status: hasLocalContext ? 'ready' : 'empty',
    },
    {
      id: 'guest-specific',
      label: 'Structured guest guidance',
      detail: hasStructuredGuestGuidance
        ? 'Structured room blocks, shuttle plans, or destination guidance are available for guest travel surfaces.'
        : input.eventInviteScoped
          ? 'Travel details can already inherit invite visibility, but structured guest guidance still needs room blocks, shuttles, or local tips.'
          : 'Structured guest travel guidance still needs room blocks, shuttles, or local tips before this lane feels complete.',
      status: hasStructuredGuestGuidance ? 'ready' : 'planned',
    },
  ];

  const blockers = steps
    .filter((step) => step.status === 'needs-info')
    .map((step) => step.detail);

  return {
    readyCount: steps.filter((step) => step.status === 'ready').length,
    steps,
    blockers,
  };
}

export function buildTravelGuestJourney(input: TravelGuestJourneyInput): TravelGuestJourneyStep[] {
  const siteSlug = input.siteSlug.trim().toLowerCase();
  if (!siteSlug) return [];

  const encodedSlug = encodeURIComponent(siteSlug);
  const withGuestContext = (href: string) => appendGuestLanguageToInternalHref(
    appendGuestInviteTokenToInternalHref(href, input.guestInviteToken?.trim() || null),
    input.guestLanguage?.trim() || null,
  );
  const candidates: Array<TravelGuestJourneyStep & { actionId: GuestHubActionId }> = [
    {
      id: 'travel',
      actionId: 'travel',
      label: 'Travel details',
      detail: 'Review travel, venue, and weekend timing before you reply.',
      href: withGuestContext(`/site/${encodedSlug}#travel`),
      status: 'ready',
    },
    {
      id: 'rsvp',
      actionId: 'rsvp',
      label: 'Reply',
      detail: 'Confirm attendance and any event-specific details from the same hub.',
      href: withGuestContext(`/site/${encodedSlug}#rsvp`),
      status: 'ready',
    },
    {
      id: 'photos',
      actionId: 'photos',
      label: 'Upload photos',
      detail: 'Share photos or videos without installing an app.',
      href: withGuestContext(`/photos/upload?site=${encodedSlug}&hub=1`),
      status: 'ready',
    },
  ];

  return candidates.map(({ actionId, ...step }) => {
    const ready = hasAction(input.enabledActionIds, actionId);
    return {
      ...step,
      href: ready ? getSafePublicActionHref(step.href, '') : '',
      status: ready ? 'ready' : 'needs-info',
    };
  });
}

export function buildTravelVenueMapLinks(venues: TravelVenueMapInput[]): TravelVenueMapLink[] {
  return venues
    .map((venue) => {
      const fallbackQuery = [venue.label, venue.address].map((part) => part?.trim()).filter(Boolean).join(' ');
      return {
        id: venue.id,
        label: venue.label,
        href: getSafePublicMapsUrl(venue.mapUrl, fallbackQuery),
      };
    })
    .filter((venue): venue is TravelVenueMapLink => Boolean(venue.href));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatTravelEventTime(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildTravelHubSpotlightHtml(input: {
  summary: string;
  travelHref: string;
  cards: TravelHubSpotlightCard[];
  coupleLabel?: string | null;
  weddingDateLabel?: string | null;
  guestScoped?: boolean;
}): string {
  const title = input.coupleLabel?.trim() || 'DayOf travel guide';
  const dateLine = input.weddingDateLabel?.trim();
  const guestScopeCopy = input.guestScoped
    ? '<p>This guide reflects the events visible for this invitation.</p>'
    : '';
  const cardsMarkup = input.cards.map((card) => `
      <li>
        <strong>${card.href ? `<a href="${escapeHtml(card.href)}">${escapeHtml(card.label)}</a>` : escapeHtml(card.label)}</strong><br />
        <span>${escapeHtml(card.detail)}</span>
      </li>`).join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} travel guide</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; margin: 40px; color: #2f261d; background: #fbf7f1; }
      main { max-width: 760px; margin: 0 auto; background: #fffdf9; border: 1px solid #eadfd2; border-radius: 16px; padding: 32px; }
      h1 { margin: 0 0 8px; font-size: 32px; }
      p { line-height: 1.6; }
      ul { padding-left: 20px; }
      li { margin: 0 0 14px; }
      a { color: #2f261d; }
      .eyebrow { font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #8b6f53; }
      .summary { margin: 18px 0 22px; }
    </style>
  </head>
  <body>
    <main>
      <div class="eyebrow">DayOf travel guide</div>
      <h1>${escapeHtml(title)}</h1>
      ${dateLine ? `<p>${escapeHtml(dateLine)}</p>` : ''}
      <p class="summary">${escapeHtml(input.summary)}</p>
      ${guestScopeCopy}
      <ul>${cardsMarkup}
      </ul>
      <p><a href="${escapeHtml(input.travelHref)}">Open the live travel page</a></p>
    </main>
  </body>
</html>`;
}

export function buildTravelHubSpotlight(input: {
  siteSlug: string;
  travel: unknown;
  enabledActionIds: GuestHubActionId[];
  guestInviteToken?: string | null;
  guestLanguage?: string | null;
  coupleLabel?: string | null;
  weddingDateLabel?: string | null;
  schedule?: Array<{ id?: string | null; label?: string | null; startTimeISO?: string | null; venueId?: string | null; notes?: string | null }>;
  venues?: Array<{ id?: string | null; name?: string | null; address?: string | null; mapUrl?: string | null }>;
}): TravelHubSpotlight | null {
  const siteSlug = input.siteSlug.trim().toLowerCase();
  if (!siteSlug || !hasAction(input.enabledActionIds, 'travel')) return null;

  const structured = normalizeTravelPortalData(input.travel);
  const cards: TravelHubSpotlightCard[] = [];
  const guestScoped = Boolean(input.guestInviteToken?.trim());

  const firstHotel = structured.hotels[0];
  if (firstHotel) {
    const detail = [
      firstHotel.distance,
      firstHotel.bookingCode ? `Code ${firstHotel.bookingCode}` : null,
      firstHotel.bookingDeadline ? `Book by ${firstHotel.bookingDeadline}` : null,
    ].filter(Boolean).join(' · ');
    cards.push({
      id: 'hotel',
      label: firstHotel.name,
      detail: detail || 'Hotel option ready for guests.',
      href: firstHotel.url,
    });
  } else if (structured.hotelInfo) {
    cards.push({
      id: 'hotel-note',
      label: 'Stay notes',
      detail: structured.hotelInfo,
    });
  }

  const firstRoomBlock = structured.roomBlocks[0];
  if (firstRoomBlock) {
    cards.push({
      id: 'room-block',
      label: 'Room block',
      detail: [firstRoomBlock.hotelName, firstRoomBlock.bookingCode ? `Code ${firstRoomBlock.bookingCode}` : null, firstRoomBlock.bookingDeadline].filter(Boolean).join(' · '),
      href: firstRoomBlock.url,
    });
  }

  const firstShuttle = structured.shuttles[0];
  if (firstShuttle) {
    cards.push({
      id: 'shuttle',
      label: firstShuttle.label,
      detail: [firstShuttle.route, firstShuttle.departureTime, firstShuttle.returnTime, firstShuttle.notes].filter(Boolean).join(' · ') || 'Shuttle plan ready.',
    });
  }

  if (structured.parkingInfo) {
    const parkingLabel = firstShuttle ? 'Parking' : 'Parking and arrival';
    cards.push({
      id: 'parking',
      label: parkingLabel,
      detail: structured.parkingInfo,
    });
  }

  if (structured.flightInfo) {
    cards.push({
      id: 'flight-info',
      label: 'Arrival guidance',
      detail: structured.flightInfo,
    });
  }

  const firstVisaTip = structured.visaTips[0];
  if (firstVisaTip) {
    cards.push({
      id: 'visa-tip',
      label: 'Arrival tip',
      detail: firstVisaTip,
    });
  }

  const firstCulturalTip = structured.culturalTips[0];
  if (firstCulturalTip) {
    cards.push({
      id: 'cultural-tip',
      label: 'Local tip',
      detail: firstCulturalTip,
    });
  } else if (structured.notes) {
    cards.push({
      id: 'guest-note',
      label: 'Guest note',
      detail: structured.notes,
    });
  }

  const visibleVenues = (input.venues ?? []).filter((venue) => venue && (venue.name?.trim() || venue.address?.trim()));
  const visibleSchedule = (input.schedule ?? [])
    .filter((item) => item?.label?.trim())
    .slice(0, 3);
  visibleSchedule.forEach((scheduledStep, index) => {
    const venueName = visibleVenues.find((venue) => venue.id && venue.id === scheduledStep.venueId)?.name?.trim() || '';
    const timeLabel = formatTravelEventTime(scheduledStep.startTimeISO);
    const detail = [timeLabel, venueName, scheduledStep.notes?.trim() || null].filter(Boolean).join(' · ');
    cards.push({
      id: `event-window-${index}`,
      label: scheduledStep.label?.trim() || 'Visible event timing',
      detail: detail || 'Visible event timing is ready for this invitation.',
    });
  });

  const venueMapLinks = buildTravelVenueMapLinks(
    visibleVenues.map((venue, index) => ({
      id: venue.id?.trim() || `venue-${index}`,
      label: venue.name?.trim() || `Venue ${index + 1}`,
      address: venue.address?.trim() || null,
      mapUrl: venue.mapUrl?.trim() || null,
    })),
  );
  venueMapLinks.slice(0, 2).forEach((venueLink, index) => {
    const venue = visibleVenues.find((candidate) => (candidate.id?.trim() || '') === venueLink.id);
    cards.push({
      id: `venue-route-${index}`,
      label: `Directions · ${venueLink.label}`,
      detail: venue?.address?.trim() || 'Guest-safe map directions are ready from the hub.',
      href: venueLink.href,
    });
  });

  if (cards.length === 0) return null;

  const travelHref = appendGuestLanguageToInternalHref(
    appendGuestInviteTokenToInternalHref(
      getSafePublicActionHref(`/site/${encodeURIComponent(siteSlug)}#travel`, ''),
      input.guestInviteToken?.trim() || null,
    ),
    input.guestLanguage?.trim() || null,
  );
  const shareText = [
    'DayOf travel quick plan',
    ...(guestScoped ? ['Guide reflects the events visible for this invitation.'] : []),
    ...cards.map((card) => `${card.label}: ${card.detail}`),
    `Travel page: ${travelHref}`,
  ].join('\n');
  const summary = `${cards.length} travel detail${cards.length === 1 ? '' : 's'} ready from the guest hub.`;
  const filename = `${siteSlug.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'dayof'}-travel-guide.html`;

  return {
    summary,
    travelHref,
    cards,
    shareText,
    htmlDocument: buildTravelHubSpotlightHtml({
      summary,
      travelHref,
      cards,
      coupleLabel: input.coupleLabel,
      weddingDateLabel: input.weddingDateLabel,
      guestScoped,
    }),
    filename,
  };
}
