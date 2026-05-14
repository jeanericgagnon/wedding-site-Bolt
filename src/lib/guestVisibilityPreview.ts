import { getPerEventRsvpState } from './perEventRsvpState';

export interface VisibilityPreviewGuest {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  inviteToken?: string | null;
  invitedToCeremony?: boolean | null;
  invitedToReception?: boolean | null;
  plusOneAllowed?: boolean | null;
  householdId?: string | null;
}

export interface VisibilityPreviewEvent {
  id: string;
  eventName: string;
  eventDate?: string | null;
  startTime?: string | null;
  locationName?: string | null;
}

export interface VisibilityPreviewHouseholdMember {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  rsvpStatus?: string | null;
}

export interface GuestVisibilityPreviewInput {
  guest: VisibilityPreviewGuest;
  events: VisibilityPreviewEvent[];
  invitedEventIds?: Iterable<string> | null;
  householdMembers?: VisibilityPreviewHouseholdMember[];
  publicSiteSlug?: string | null;
}

export interface GuestVisibilityPreviewLink {
  label: string;
  href: string;
  kind: 'rsvp' | 'site' | 'contact' | 'photos' | 'guestbook' | 'recap' | 'travel' | 'registry';
}

export interface GuestVisibilityPreview {
  guestLabel: string;
  bannerLabel: string;
  accessSummary: string;
  accessDetail: string;
  visibleEvents: VisibilityPreviewEvent[];
  hiddenEvents: VisibilityPreviewEvent[];
  householdSummary: string;
  warnings: string[];
  links: GuestVisibilityPreviewLink[];
}

function guestDisplayName(guest: VisibilityPreviewGuest): string {
  const fromParts = `${guest.firstName ?? ''} ${guest.lastName ?? ''}`.trim();
  return fromParts || guest.name?.trim() || 'this guest';
}

function formatEventList(events: VisibilityPreviewEvent[]): string {
  if (events.length === 0) return 'no itinerary events';
  if (events.length === 1) return events[0].eventName;
  if (events.length === 2) return `${events[0].eventName} and ${events[1].eventName}`;
  return `${events.slice(0, 2).map((event) => event.eventName).join(', ')}, and ${events.length - 2} more`;
}

function legacyEventsForGuest(guest: VisibilityPreviewGuest): VisibilityPreviewEvent[] {
  const events: VisibilityPreviewEvent[] = [];
  if (guest.invitedToCeremony !== false) {
    events.push({ id: 'legacy-ceremony', eventName: 'Ceremony' });
  }
  if (guest.invitedToReception !== false) {
    events.push({ id: 'legacy-reception', eventName: 'Reception' });
  }
  return events;
}

function hiddenLegacyEventsForGuest(guest: VisibilityPreviewGuest): VisibilityPreviewEvent[] {
  const events: VisibilityPreviewEvent[] = [];
  if (guest.invitedToCeremony === false) {
    events.push({ id: 'legacy-ceremony', eventName: 'Ceremony' });
  }
  if (guest.invitedToReception === false) {
    events.push({ id: 'legacy-reception', eventName: 'Reception' });
  }
  return events;
}

export function buildGuestVisibilityPreview(input: GuestVisibilityPreviewInput): GuestVisibilityPreview {
  const guestLabel = guestDisplayName(input.guest);
  const invitedEventIds = new Set(input.invitedEventIds ?? []);
  const hasStructuredEvents = input.events.length > 0;
  const visibleEvents = hasStructuredEvents
    ? input.events.filter((event) => invitedEventIds.has(event.id))
    : legacyEventsForGuest(input.guest);
  const hiddenEvents = hasStructuredEvents
    ? input.events.filter((event) => !invitedEventIds.has(event.id))
    : hiddenLegacyEventsForGuest(input.guest);

  const householdMembers = input.householdMembers ?? [];
  const otherHouseholdMembers = householdMembers.filter((member) => member.id !== input.guest.id);
  const householdStatuses = new Set(householdMembers.map((member) => member.rsvpStatus).filter(Boolean));
  const warnings: string[] = [];
  const eventState = getPerEventRsvpState({
    invitedToCeremony: input.guest.invitedToCeremony ?? undefined,
    invitedToReception: input.guest.invitedToReception ?? undefined,
    invitedEventIds: hasStructuredEvents ? Array.from(invitedEventIds) : null,
  });

  if (!input.guest.inviteToken) {
    warnings.push('No private RSVP link exists yet for this guest.');
  }
  if (visibleEvents.length === 0) {
    warnings.push('This guest is not invited to any visible event yet.');
  }
  if (householdStatuses.size > 1) {
    warnings.push('Household RSVP states are mixed, so preview this guest before sending reminders.');
  }
  if (input.publicSiteSlug) {
    warnings.push('Public site preview opens the site shell with this guest context; private event gating is proven in the RSVP preview.');
  }

  const totalEventCount = hasStructuredEvents ? input.events.length : visibleEvents.length + hiddenEvents.length;

  const links: GuestVisibilityPreviewLink[] = [];
  if (input.guest.inviteToken) {
    links.push({
      kind: 'rsvp',
      label: 'Open RSVP as guest',
      href: `/rsvp?token=${encodeURIComponent(input.guest.inviteToken)}&previewGuest=${encodeURIComponent(input.guest.id)}&previewSurface=rsvp`,
    });
  }
  if (input.guest.inviteToken && input.publicSiteSlug) {
    links.push({
      kind: 'contact',
      label: 'Open guest update view',
      href: `/guest-contact/${encodeURIComponent(input.publicSiteSlug)}?invite_token=${encodeURIComponent(input.guest.inviteToken)}&previewGuest=${encodeURIComponent(input.guest.id)}&previewSurface=contact`,
    });
    links.push({
      kind: 'photos',
      label: 'Open photo upload as guest',
      href: `/photos/upload?site=${encodeURIComponent(input.publicSiteSlug)}&hub=1&invite_token=${encodeURIComponent(input.guest.inviteToken)}&previewGuest=${encodeURIComponent(input.guest.id)}&previewSurface=photos`,
    });
    links.push({
      kind: 'guestbook',
      label: 'Open guestbook as guest',
      href: `/guestbook/${encodeURIComponent(input.publicSiteSlug)}?invite_token=${encodeURIComponent(input.guest.inviteToken)}&previewGuest=${encodeURIComponent(input.guest.id)}&previewSurface=guestbook`,
    });
    links.push({
      kind: 'recap',
      label: 'Open recap as guest',
      href: `/event/${encodeURIComponent(input.publicSiteSlug)}/recap?invite_token=${encodeURIComponent(input.guest.inviteToken)}&previewGuest=${encodeURIComponent(input.guest.id)}&previewSurface=recap`,
    });
  }
  if (input.publicSiteSlug) {
    links.push({
      kind: 'travel',
      label: 'Open travel section as guest',
      href: `/site/${encodeURIComponent(input.publicSiteSlug)}?previewGuest=${encodeURIComponent(input.guest.id)}&previewSurface=travel#travel`,
    });
    links.push({
      kind: 'registry',
      label: 'Open registry section as guest',
      href: `/site/${encodeURIComponent(input.publicSiteSlug)}?previewGuest=${encodeURIComponent(input.guest.id)}&previewSurface=registry#registry`,
    });
    links.push({
      kind: 'site',
      label: 'Open public site view',
      href: `/site/${encodeURIComponent(input.publicSiteSlug)}?previewGuest=${encodeURIComponent(input.guest.id)}&previewSurface=public`,
    });
  }

  return {
    guestLabel,
    bannerLabel: `Previewing as ${guestLabel}`,
    accessSummary: visibleEvents.length > 0
      ? `${visibleEvents.length} of ${totalEventCount} event${totalEventCount === 1 ? '' : 's'} visible`
      : 'No invited events yet',
    accessDetail: visibleEvents.length > 0
      ? `${eventState.summary}: ${guestLabel} should see ${formatEventList(visibleEvents)}.`
      : `${guestLabel} needs at least one event invitation before this guest path is ready.`,
    visibleEvents,
    hiddenEvents,
    householdSummary: otherHouseholdMembers.length > 0
      ? `${otherHouseholdMembers.length + 1} household member${otherHouseholdMembers.length === 0 ? '' : 's'} in this group.`
      : 'No other household members are grouped with this guest.',
    warnings,
    links,
  };
}
