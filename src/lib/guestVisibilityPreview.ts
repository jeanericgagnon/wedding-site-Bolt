import { getPerEventRsvpState } from './perEventRsvpState';
import { appendGuestLanguageToInternalHref } from './guestLanguagePreference';

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
  preferredLanguage?: string | null;
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
  isPublished?: boolean;
  publicSiteSlug?: string | null;
}

export interface GuestVisibilityPreviewLink {
  label: string;
  href: string;
  kind: 'rsvp' | 'site' | 'contact' | 'photos' | 'guestbook' | 'vault' | 'recap' | 'travel' | 'registry';
}

export interface GuestVisibilityPreview {
  guestLabel: string;
  bannerLabel: string;
  accessSummary: string;
  accessDetail: string;
  routeReadinessLabel: string;
  pathCoverageSummary: string;
  visibleEventSummary: string | null;
  hiddenEventSummary: string | null;
  mainGapLabel: string | null;
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
  const inviteToken = input.guest.inviteToken ?? '';
  const publicSiteSlug = input.publicSiteSlug ?? '';
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
  if (input.publicSiteSlug && input.isPublished) {
    warnings.push('Public site preview opens the site shell with this guest context; private event gating is proven in the RSVP preview.');
  } else if (input.publicSiteSlug) {
    warnings.push('Publish the site before sharing public guest-preview links or QR codes.');
  }

  const totalEventCount = hasStructuredEvents ? input.events.length : visibleEvents.length + hiddenEvents.length;
  const hasPrivateInviteAccess = Boolean(input.guest.inviteToken);
  const hasPublicShellPreview = Boolean(input.publicSiteSlug && input.isPublished);

  const links: GuestVisibilityPreviewLink[] = [];
  if (hasPrivateInviteAccess) {
    links.push({
      kind: 'rsvp',
      label: 'Open RSVP as guest',
      href: appendGuestLanguageToInternalHref(
        `/rsvp?token=${encodeURIComponent(inviteToken)}&previewGuest=${encodeURIComponent(input.guest.id)}&previewSurface=rsvp`,
        input.guest.preferredLanguage,
      ),
    });
  }
  if (hasPrivateInviteAccess && input.publicSiteSlug) {
    links.push({
      kind: 'contact',
      label: 'Open guest update view',
      href: appendGuestLanguageToInternalHref(
        `/guest-contact/${encodeURIComponent(publicSiteSlug)}?invite_token=${encodeURIComponent(inviteToken)}&previewGuest=${encodeURIComponent(input.guest.id)}&previewSurface=contact`,
        input.guest.preferredLanguage,
      ),
    });
    links.push({
      kind: 'photos',
      label: 'Open photo upload as guest',
      href: appendGuestLanguageToInternalHref(
        `/photos/upload?site=${encodeURIComponent(publicSiteSlug)}&hub=1&invite_token=${encodeURIComponent(inviteToken)}&previewGuest=${encodeURIComponent(input.guest.id)}&previewSurface=photos`,
        input.guest.preferredLanguage,
      ),
    });
    links.push({
      kind: 'guestbook',
      label: 'Open guestbook as guest',
      href: appendGuestLanguageToInternalHref(
        `/guestbook/${encodeURIComponent(publicSiteSlug)}?invite_token=${encodeURIComponent(inviteToken)}&previewGuest=${encodeURIComponent(input.guest.id)}&previewSurface=guestbook`,
        input.guest.preferredLanguage,
      ),
    });
    links.push({
      kind: 'vault',
      label: 'Open anniversary vault as guest',
      href: appendGuestLanguageToInternalHref(
        `/vault/${encodeURIComponent(publicSiteSlug)}?invite_token=${encodeURIComponent(inviteToken)}&previewGuest=${encodeURIComponent(input.guest.id)}&previewSurface=vault`,
        input.guest.preferredLanguage,
      ),
    });
    links.push({
      kind: 'recap',
      label: 'Open recap as guest',
      href: appendGuestLanguageToInternalHref(
        `/event/${encodeURIComponent(publicSiteSlug)}/recap?invite_token=${encodeURIComponent(inviteToken)}&previewGuest=${encodeURIComponent(input.guest.id)}&previewSurface=recap`,
        input.guest.preferredLanguage,
      ),
    });
  }
  if (input.publicSiteSlug && input.isPublished) {
    links.push({
      kind: 'travel',
      label: 'Open travel section as guest',
      href: appendGuestLanguageToInternalHref(
        `/site/${encodeURIComponent(publicSiteSlug)}?previewGuest=${encodeURIComponent(input.guest.id)}&previewSurface=travel#travel`,
        input.guest.preferredLanguage,
      ),
    });
    links.push({
      kind: 'registry',
      label: 'Open registry section as guest',
      href: appendGuestLanguageToInternalHref(
        `/site/${encodeURIComponent(publicSiteSlug)}?previewGuest=${encodeURIComponent(input.guest.id)}&previewSurface=registry#registry`,
        input.guest.preferredLanguage,
      ),
    });
    links.push({
      kind: 'site',
      label: 'Open public site view',
      href: appendGuestLanguageToInternalHref(
        `/site/${encodeURIComponent(publicSiteSlug)}?previewGuest=${encodeURIComponent(input.guest.id)}&previewSurface=public`,
        input.guest.preferredLanguage,
      ),
    });
  }

  const pathCoverageSummary = visibleEvents.length > 0
    ? hasPrivateInviteAccess
      ? `${visibleEvents.length} visible event${visibleEvents.length === 1 ? ' has' : 's have'} a private guest path ready.`
      : `${visibleEvents.length} visible event${visibleEvents.length === 1 ? ' exists' : 's exist'}, but private guest-link coverage still needs setup.`
    : hasPublicShellPreview
      ? 'Public shell preview is ready, but this guest still has no visible private event access.'
      : 'No guest-facing preview path is fully ready yet.';
  const routeReadinessLabel = visibleEvents.length > 0
    ? hasPrivateInviteAccess
      ? 'Private guest path ready'
      : hasPublicShellPreview
        ? 'Public shell plus visible events'
        : 'Visible events without private link'
    : hasPublicShellPreview
      ? 'Public shell only'
      : 'No guest path ready';
  const mainGapLabel = visibleEvents.length === 0
    ? 'Main gap: Invite this guest to at least one visible event'
    : hasPrivateInviteAccess
      ? null
      : 'Main gap: Rotate or create a private RSVP link';

  return {
    guestLabel,
    bannerLabel: `Previewing as ${guestLabel}`,
    accessSummary: visibleEvents.length > 0
      ? `${visibleEvents.length} of ${totalEventCount} event${totalEventCount === 1 ? '' : 's'} visible · ${hiddenEvents.length} hidden`
      : 'No invited events yet',
    accessDetail: visibleEvents.length > 0
      ? `${eventState.summary}: ${guestLabel} should see ${formatEventList(visibleEvents)}.`
      : `${guestLabel} needs at least one event invitation before this guest path is ready.`,
    routeReadinessLabel,
    pathCoverageSummary,
    visibleEventSummary: visibleEvents.length > 0
      ? `Visible to this guest: ${formatEventList(visibleEvents)}.`
      : 'No visible events for this guest yet.',
    hiddenEventSummary: hiddenEvents.length > 0
      ? `Hidden from this guest: ${formatEventList(hiddenEvents)}.`
      : 'No hidden events for this guest.',
    mainGapLabel,
    visibleEvents,
    hiddenEvents,
    householdSummary: otherHouseholdMembers.length > 0
      ? `${otherHouseholdMembers.length + 1} household member${otherHouseholdMembers.length === 0 ? '' : 's'} in this group.`
      : 'No other household members are grouped with this guest.',
    warnings,
    links,
  };
}
