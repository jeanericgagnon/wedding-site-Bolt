import { getMessageDeliveryState } from './messageDeliveryState';

export type GuestHubAnnouncementInput = {
  title?: string | null;
  detail?: string | null;
  status?: string | null;
  scheduledFor?: string | null;
  sentAt?: string | null;
};

export type GuestHubAnnouncementCard = {
  title: string;
  detail: string;
  stateLabel: string;
  stateExplainer: string;
  timingLabel: string | null;
};

export type GuestHubGuestStateInput = {
  guestName?: string | null;
  rsvpStatus?: string | null;
  checkedInAt?: string | null;
};

export type GuestHubGuestStateCard = {
  guestLabel: string;
  rsvpLabel: string;
  checkInLabel: string;
  summary: string;
};

function formatDateTime(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function scrubSensitiveCopy(value?: string | null): string {
  if (!value) return '';
  return value
    .replace(/\b(invite_token|token|access_token|auth|session|passcode|jwt|signed|signature|bearer|key|secret)=([^&\s]+)/gi, '$1=[hidden]')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatRsvpLabel(status?: string | null): string {
  const normalized = (status ?? '').trim().toLowerCase();
  if (normalized === 'confirmed' || normalized === 'attending') return 'RSVP confirmed';
  if (normalized === 'declined') return 'RSVP declined';
  return 'RSVP still pending';
}

export function buildGuestHubAnnouncementCard(input?: GuestHubAnnouncementInput | null): GuestHubAnnouncementCard | null {
  if (!input) return null;
  const title = scrubSensitiveCopy(input.title) || 'Day-of update';
  const detail = scrubSensitiveCopy(input.detail) || 'The couple has a live guest update ready here.';
  const state = getMessageDeliveryState({
    status: input.status,
    sentAt: input.sentAt,
  });
  const scheduledLabel = formatDateTime(input.scheduledFor);
  const sentLabel = formatDateTime(input.sentAt);
  const timingLabel = state.label === 'Scheduled' && scheduledLabel
    ? `Scheduled for ${scheduledLabel}`
    : state.label === 'Sent' && sentLabel
      ? `Sent ${sentLabel}`
      : state.label === 'Queued' && scheduledLabel
        ? `Queued after ${scheduledLabel}`
        : null;

  return {
    title,
    detail,
    stateLabel: state.label,
    stateExplainer: state.explainer,
    timingLabel,
  };
}

export function buildGuestHubGuestStateCard(input?: GuestHubGuestStateInput | null): GuestHubGuestStateCard | null {
  if (!input) return null;
  const guestLabel = scrubSensitiveCopy(input.guestName) || 'Your guest status';
  const rsvpLabel = formatRsvpLabel(input.rsvpStatus);
  const checkedInAt = formatDateTime(input.checkedInAt);
  const checkInLabel = checkedInAt ? `Checked in ${checkedInAt}` : 'Not checked in yet';

  return {
    guestLabel,
    rsvpLabel,
    checkInLabel,
    summary: checkedInAt
      ? `${rsvpLabel} · ${checkInLabel}`
      : `${rsvpLabel} · Use this page for the latest day-of status.`,
  };
}
