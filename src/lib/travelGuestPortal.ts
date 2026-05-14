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
  id: 'hotel' | 'room-block' | 'shuttle' | 'visa-tip' | 'cultural-tip';
  label: string;
  detail: string;
}

export interface TravelHubSpotlight {
  summary: string;
  travelHref: string;
  cards: TravelHubSpotlightCard[];
  shareText: string;
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
  const candidates: Array<TravelGuestJourneyStep & { actionId: GuestHubActionId }> = [
    {
      id: 'travel',
      actionId: 'travel',
      label: 'Travel details',
      detail: 'Review travel, venue, and weekend timing before you reply.',
      href: `/site/${encodedSlug}#travel`,
      status: 'ready',
    },
    {
      id: 'rsvp',
      actionId: 'rsvp',
      label: 'Reply',
      detail: 'Confirm attendance and any event-specific details from the same hub.',
      href: `/site/${encodedSlug}#rsvp`,
      status: 'ready',
    },
    {
      id: 'photos',
      actionId: 'photos',
      label: 'Upload photos',
      detail: 'Share photos or videos without installing an app.',
      href: `/photos/upload?site=${encodedSlug}&hub=1`,
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

export function buildTravelHubSpotlight(input: {
  siteSlug: string;
  travel: unknown;
  enabledActionIds: GuestHubActionId[];
}): TravelHubSpotlight | null {
  const siteSlug = input.siteSlug.trim().toLowerCase();
  if (!siteSlug || !hasAction(input.enabledActionIds, 'travel')) return null;

  const structured = normalizeTravelPortalData(input.travel);
  const cards: TravelHubSpotlightCard[] = [];

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
    });
  }

  const firstRoomBlock = structured.roomBlocks[0];
  if (firstRoomBlock) {
    cards.push({
      id: 'room-block',
      label: 'Room block',
      detail: [firstRoomBlock.hotelName, firstRoomBlock.bookingCode ? `Code ${firstRoomBlock.bookingCode}` : null, firstRoomBlock.bookingDeadline].filter(Boolean).join(' · '),
    });
  }

  const firstShuttle = structured.shuttles[0];
  if (firstShuttle) {
    cards.push({
      id: 'shuttle',
      label: firstShuttle.label,
      detail: [firstShuttle.route, firstShuttle.departureTime, firstShuttle.returnTime].filter(Boolean).join(' · ') || 'Shuttle plan ready.',
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
  }

  if (cards.length === 0) return null;

  const travelHref = getSafePublicActionHref(`/site/${encodeURIComponent(siteSlug)}#travel`, '');
  const shareText = [
    'DayOf travel quick plan',
    ...cards.map((card) => `${card.label}: ${card.detail}`),
    `Travel page: ${travelHref}`,
  ].join('\n');

  return {
    summary: `${cards.length} travel detail${cards.length === 1 ? '' : 's'} ready from the guest hub.`,
    travelHref,
    cards,
    shareText,
  };
}
