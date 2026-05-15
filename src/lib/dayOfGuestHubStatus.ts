import { summarizeGuestHubActions, type GuestHubActionId } from './guestHubActions';
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

export type GuestHubLinkAccessInput = {
  hasGuestInviteToken?: boolean;
  hasInviteToken?: boolean;
  hasPasswordSession?: boolean;
  guestName?: string | null;
  enabledActionIds?: GuestHubActionId[] | null;
};

export type GuestHubLinkAccessCard = {
  title: string;
  badgeLabel: string;
  detail: string;
  summary: string;
  actionCountLabel: string | null;
  actionSummaryLabel: string | null;
  readyCoreActionCountLabel: string | null;
  coreActionCoverageLabel: string | null;
  coreActionSummaryLabel: string | null;
  mainGapLabel: string | null;
};

const coreGuestHubActionIds: GuestHubActionId[] = ['rsvp', 'schedule', 'travel', 'photos'];

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

export function buildGuestHubLinkAccessCard(input?: GuestHubLinkAccessInput | null): GuestHubLinkAccessCard | null {
  if (!input) return null;

  const guestLabel = scrubSensitiveCopy(input.guestName) || 'your guest details';
  const enabledActionIds = Array.from(new Set((input.enabledActionIds ?? []).filter(Boolean)));
  const actionCount = enabledActionIds.length;
  const readyCoreActionIds = coreGuestHubActionIds.filter((id) => enabledActionIds.includes(id));
  const missingCoreActionIds = coreGuestHubActionIds.filter((id) => !enabledActionIds.includes(id));
  const coreActionCoverageRate = Math.round((readyCoreActionIds.length / coreGuestHubActionIds.length) * 100);
  const actionCountLabel = actionCount > 0
    ? `${actionCount} guest action${actionCount === 1 ? ' is' : 's are'} ready from this link.`
    : 'No guest actions are ready from this link yet.';
  const actionSummaryLabel = actionCount > 0 ? summarizeGuestHubActions(enabledActionIds.map((id) => ({ id }))) : null;
  const readyCoreActionCountLabel = readyCoreActionIds.length > 0
    ? `${readyCoreActionIds.length} of ${coreGuestHubActionIds.length} core day-of action${readyCoreActionIds.length === 1 ? ' is' : 's are'} already ready from this link.`
    : null;
  const coreActionCoverageLabel = readyCoreActionIds.length === coreGuestHubActionIds.length
    ? `100% of core day-of actions are ready from this link: ${summarizeGuestHubActions(readyCoreActionIds.map((id) => ({ id })))}.`
    : readyCoreActionIds.length > 0
      ? `${coreActionCoverageRate}% core day-of coverage is ready from this link (${readyCoreActionIds.length} of ${coreGuestHubActionIds.length}).`
      : 'Core day-of actions are not ready from this link yet.';
  const coreActionSummaryLabel = missingCoreActionIds.length > 0
    ? `${missingCoreActionIds.length} of ${coreGuestHubActionIds.length} core day-of action${missingCoreActionIds.length === 1 ? ' is' : 's are'} still missing from this link: ${summarizeGuestHubActions(missingCoreActionIds.map((id) => ({ id })))}.`
    : `0 of ${coreGuestHubActionIds.length} core day-of actions are still missing from this link. This link covers RSVP, timing, travel, and photo follow-through.`;
  const mainGapLabel = missingCoreActionIds.length > 0
    ? `Main gap: ${actionCount === 0 ? 'Turn on RSVP, schedule, travel, and photo upload' : `Add ${summarizeGuestHubActions(missingCoreActionIds.map((id) => ({ id })))} to this link`}.`
    : null;
  if (input.hasGuestInviteToken) {
    return {
      title: 'Private guest link',
      badgeLabel: 'Guest-specific',
      detail: `This link includes invite-only event details plus RSVP and check-in readback for ${guestLabel}.`,
      summary: 'Guest-specific access is active for this link, including RSVP and check-in readback.',
      actionCountLabel,
      actionSummaryLabel,
      readyCoreActionCountLabel,
      coreActionCoverageLabel,
      coreActionSummaryLabel,
      mainGapLabel,
    };
  }

  if (input.hasInviteToken || input.hasPasswordSession) {
    return {
      title: 'Private event access',
      badgeLabel: 'Invite-only',
      detail: 'This link includes invite-only wedding details that do not appear on the public site shell.',
      summary: 'Invite-only access is active for this link, without guest-specific RSVP or check-in readback.',
      actionCountLabel,
      actionSummaryLabel,
      readyCoreActionCountLabel,
      coreActionCoverageLabel,
      coreActionSummaryLabel,
      mainGapLabel,
    };
  }

  return {
    title: 'Public site view',
    badgeLabel: 'Public',
    detail: 'This link shows the public wedding hub. Invite-only event details stay on the private link from the couple.',
    summary: 'Public-only access is active for this link, without private event or guest-specific readback.',
    actionCountLabel,
    actionSummaryLabel,
    readyCoreActionCountLabel,
    coreActionCoverageLabel,
    coreActionSummaryLabel,
    mainGapLabel,
  };
}
