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

export type GuestHubCoordinatorHandoffInput = {
  eventName?: string | null;
  handoffStatus?: string | null;
  leadName?: string | null;
  supportName?: string | null;
  note?: string | null;
  updatedAt?: string | null;
};

export type GuestHubCoordinatorHandoffCard = {
  eventLabel: string;
  statusLabel: string;
  staffLabel: string;
  noteLabel: string;
  updatedLabel: string | null;
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

function formatHandoffStatusLabel(status?: string | null): string {
  const normalized = (status ?? '').trim().toLowerCase();
  if (normalized === 'staffed') return 'Staffed';
  if (normalized === 'needs-decision') return 'Needs decision';
  if (normalized === 'complete') return 'Complete';
  return 'Ready';
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

export function buildGuestHubCoordinatorHandoffCard(input?: GuestHubCoordinatorHandoffInput | null): GuestHubCoordinatorHandoffCard | null {
  if (!input) return null;

  const eventLabel = scrubSensitiveCopy(input.eventName) || 'Event handoff';
  const statusLabel = formatHandoffStatusLabel(input.handoffStatus);
  const lead = scrubSensitiveCopy(input.leadName) || 'Team lead pending';
  const support = scrubSensitiveCopy(input.supportName) || 'Support pending';
  const note = scrubSensitiveCopy(input.note) || 'No guest-facing handoff note yet.';
  const updatedAt = formatDateTime(input.updatedAt);

  return {
    eventLabel,
    statusLabel,
    staffLabel: `${lead} · ${support}`,
    noteLabel: note,
    updatedLabel: updatedAt ? `Updated ${updatedAt}` : null,
    summary: `${eventLabel} · ${statusLabel}`,
  };
}
