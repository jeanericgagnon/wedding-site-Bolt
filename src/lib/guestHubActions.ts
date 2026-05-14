import { appendGuestInviteTokenToInternalHref } from './publicAccessArtifacts';

export type GuestHubActionId = 'rsvp' | 'schedule' | 'travel' | 'registry' | 'photos' | 'guestbook' | 'vault' | 'recap' | 'contact';

export interface GuestHubActionSettings {
  rsvp_enabled?: boolean | null;
  photos_enabled?: boolean | null;
  guestbook_enabled?: boolean | null;
  registry_enabled?: boolean | null;
  schedule_enabled?: boolean | null;
  travel_enabled?: boolean | null;
}

export interface GuestHubActionOptions {
  guestContactHref?: string | null;
  guestInviteToken?: string | null;
}

export interface GuestHubAction {
  id: GuestHubActionId;
  titleKey: string;
  detailKey: string;
  href: string;
  primary?: boolean;
}

const isEnabled = (value: boolean | null | undefined) => value !== false;

export function buildGuestHubActions(slug: string, settings: GuestHubActionSettings, options: GuestHubActionOptions = {}): GuestHubAction[] {
  const encodedSlug = encodeURIComponent(slug);
  const guestInviteToken = options.guestInviteToken?.trim() || null;
  const actions: GuestHubAction[] = [
    {
      id: 'rsvp',
      titleKey: 'guest_hub.action_rsvp',
      detailKey: 'guest_hub.action_rsvp_detail',
      href: `/site/${encodedSlug}#rsvp`,
      primary: true,
    },
    {
      id: 'schedule',
      titleKey: 'guest_hub.action_schedule',
      detailKey: 'guest_hub.action_schedule_detail',
      href: `/site/${encodedSlug}#schedule`,
    },
    {
      id: 'travel',
      titleKey: 'guest_hub.action_travel',
      detailKey: 'guest_hub.action_travel_detail',
      href: `/site/${encodedSlug}#travel`,
    },
    {
      id: 'registry',
      titleKey: 'guest_hub.action_registry',
      detailKey: 'guest_hub.action_registry_detail',
      href: `/site/${encodedSlug}#registry`,
    },
    {
      id: 'photos',
      titleKey: 'guest_hub.action_upload',
      detailKey: 'guest_hub.action_upload_detail',
      href: appendGuestInviteTokenToInternalHref(`/photos/upload?site=${encodedSlug}&hub=1`, guestInviteToken),
    },
    {
      id: 'guestbook',
      titleKey: 'guest_hub.action_guestbook',
      detailKey: 'guest_hub.action_guestbook_detail',
      href: appendGuestInviteTokenToInternalHref(`/guestbook/${encodedSlug}`, guestInviteToken),
    },
    {
      id: 'vault',
      titleKey: 'guest_hub.action_vault',
      detailKey: 'guest_hub.action_vault_detail',
      href: appendGuestInviteTokenToInternalHref(`/vault/${encodedSlug}`, guestInviteToken),
    },
    {
      id: 'recap',
      titleKey: 'guest_hub.action_recap',
      detailKey: 'guest_hub.action_recap_detail',
      href: appendGuestInviteTokenToInternalHref(`/event/${encodedSlug}/recap`, guestInviteToken),
    },
  ];

  const guestContactHref = options.guestContactHref?.trim();
  if (guestContactHref) {
    actions.splice(1, 0, {
      id: 'contact',
      titleKey: 'guest_hub.action_contact',
      detailKey: 'guest_hub.action_contact_detail',
      href: appendGuestInviteTokenToInternalHref(guestContactHref, guestInviteToken),
    });
  }

  return actions.filter((action) => {
    if (action.id === 'rsvp') return isEnabled(settings.rsvp_enabled);
    if (action.id === 'schedule') return isEnabled(settings.schedule_enabled);
    if (action.id === 'travel') return isEnabled(settings.travel_enabled);
    if (action.id === 'registry') return isEnabled(settings.registry_enabled);
    if (action.id === 'photos' || action.id === 'recap') return isEnabled(settings.photos_enabled);
    if (action.id === 'guestbook') return isEnabled(settings.guestbook_enabled);
    if (action.id === 'vault') return Boolean(guestInviteToken);
    return true;
  });
}

export function summarizeGuestHubActions(actions: Pick<GuestHubAction, 'id'>[]): string {
  const labels: Record<GuestHubActionId, string> = {
    rsvp: 'RSVP',
    schedule: 'schedule',
    travel: 'travel',
    registry: 'registry',
    photos: 'photo upload',
    guestbook: 'guestbook',
    vault: 'anniversary vault',
    recap: 'photo recap',
    contact: 'guest update',
  };
  const parts = actions.map((action) => labels[action.id]).filter(Boolean);
  if (parts.length === 0) return 'No guest actions are enabled yet';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}
