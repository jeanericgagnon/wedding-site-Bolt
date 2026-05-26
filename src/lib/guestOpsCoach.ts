export interface GuestOpsSnapshot {
  totalGuests: number;
  attendingGuests: number;
  pendingResponses: number;
  pendingWithoutEmail: number;
  noContact: number;
  missingMealChoices: number;
  missingPlusOneNames: number;
  manualFollowUp?: number;
  manualHandled?: number;
}

export interface GuestOpsCoachAction {
  id: 'import-guests' | 'collect-contact' | 'collect-pending-email' | 'send-rsvp-reminder' | 'collect-meals' | 'collect-plus-ones' | 'review-manual-follow-up' | 'healthy';
  title: string;
  detail: string;
  filter: string;
  area: 'guests' | 'messages';
  ctaLabel: string;
  taskLabel: string;
}

export interface GuestOpsCoachSummary {
  readinessScore: number;
  tone: 'urgent' | 'steady' | 'healthy';
  statusLabel: string;
  summary: string;
  actions: GuestOpsCoachAction[];
  primaryAction: GuestOpsCoachAction | null;
}

export interface MessageOpsSnapshot {
  scheduledCount: number;
  overdueScheduledCount: number;
  partialCount: number;
  failedCount: number;
  unreachedRecipientCount: number;
}

export interface MessageOpsCoachPlay {
  id: 'review-partial' | 'review-failed' | 'run-due-scheduled' | 'collect-contact' | 'send-rsvp-reminder' | 'stage-day-of-update' | 'steady';
  status: 'review' | 'blocked' | 'ready' | 'calm';
  title: string;
  detail: string;
  actionLabel: string;
  action:
    | 'open-partial'
    | 'open-failed'
    | 'run-due-scheduled'
    | 'open-guests'
    | 'compose-rsvp-reminder'
    | 'compose-day-of-update'
    | 'none';
}

export interface MessageOpsCoachSummary {
  pulse: string;
  summary: string;
  plays: MessageOpsCoachPlay[];
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildHealthyGuestSummary(snapshot: GuestOpsSnapshot): string {
  if (snapshot.totalGuests === 0) {
    return 'Bring in your guest list first so DayOf can start coaching the RSVP and messaging lanes.';
  }
  if (snapshot.attendingGuests > 0) {
    return `Guest ops looks steady. ${snapshot.attendingGuests} guest${snapshot.attendingGuests === 1 ? '' : 's'} are currently marked attending, and the RSVP cleanup lane is calm.`;
  }
  return 'Guest ops looks steady. Contact coverage and RSVP cleanup are in a calm state right now.';
}

export function buildGuestOpsCoach(snapshot: GuestOpsSnapshot): GuestOpsCoachSummary {
  const penalties =
    snapshot.pendingResponses * 5 +
    snapshot.pendingWithoutEmail * 12 +
    snapshot.noContact * 7 +
    snapshot.missingMealChoices * 6 +
    snapshot.missingPlusOneNames * 5 +
    (snapshot.manualFollowUp ?? 0) * 4;

  const readinessScore = snapshot.totalGuests === 0 ? 72 : clampScore(100 - penalties);

  const actions: GuestOpsCoachAction[] = [];

  if (snapshot.totalGuests === 0) {
    actions.push({
      id: 'import-guests',
      title: 'Bring in your first guest list',
      detail: 'The next layer of intelligence unlocks once guests exist here.',
      filter: 'all',
      area: 'guests',
      ctaLabel: 'Open guest list',
      taskLabel: 'Import guest list',
    });
  }

  if (snapshot.pendingWithoutEmail > 0) {
    actions.push({
      id: 'collect-pending-email',
      title: 'Collect missing email addresses first',
      detail: `${snapshot.pendingWithoutEmail} pending guest${snapshot.pendingWithoutEmail === 1 ? '' : 's'} cannot receive reminders yet.`,
      filter: 'pending-no-email',
      area: 'guests',
      ctaLabel: 'Review pending without email',
      taskLabel: 'Collect missing guest emails',
    });
  }

  if (snapshot.noContact > 0) {
    actions.push({
      id: 'collect-contact',
      title: 'Close contact gaps before the next send',
      detail: `${snapshot.noContact} guest${snapshot.noContact === 1 ? '' : 's'} still have no email or phone on file.`,
      filter: 'no-contact',
      area: 'guests',
      ctaLabel: 'Review no-contact guests',
      taskLabel: 'Resolve missing guest contact info',
    });
  }

  if (snapshot.pendingResponses > 0) {
    actions.push({
      id: 'send-rsvp-reminder',
      title: 'Nudge the pending RSVP group',
      detail: `${snapshot.pendingResponses} guest${snapshot.pendingResponses === 1 ? '' : 's'} still have not replied.`,
      filter: 'pending',
      area: 'messages',
      ctaLabel: 'Load RSVP reminder',
      taskLabel: 'Follow up with pending RSVPs',
    });
  }

  if (snapshot.missingMealChoices > 0) {
    actions.push({
      id: 'collect-meals',
      title: 'Collect missing meal choices',
      detail: `${snapshot.missingMealChoices} attending guest${snapshot.missingMealChoices === 1 ? '' : 's'} still need a meal selection.`,
      filter: 'missing-meal',
      area: 'guests',
      ctaLabel: 'Review meal gaps',
      taskLabel: 'Collect missing meal choices',
    });
  }

  if (snapshot.missingPlusOneNames > 0) {
    actions.push({
      id: 'collect-plus-ones',
      title: 'Resolve unnamed plus-ones',
      detail: `${snapshot.missingPlusOneNames} RSVP${snapshot.missingPlusOneNames === 1 ? '' : 's'} still allow a plus-one without a saved name.`,
      filter: 'plusone-missing',
      area: 'guests',
      ctaLabel: 'Review plus-one gaps',
      taskLabel: 'Collect missing plus-one names',
    });
  }

  if ((snapshot.manualFollowUp ?? 0) > 0) {
    actions.push({
      id: 'review-manual-follow-up',
      title: 'Close the manual follow-up queue',
      detail: `${snapshot.manualFollowUp} guest${(snapshot.manualFollowUp ?? 0) === 1 ? '' : 's'} are still flagged for offline or manual RSVP follow-up.`,
      filter: 'manual-follow-up',
      area: 'guests',
      ctaLabel: 'Review manual follow-up',
      taskLabel: 'Resolve manual RSVP follow-up',
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: 'healthy',
      title: 'Guest ops is in a healthy state',
      detail: 'RSVP cleanup, contact coverage, and meal/plus-one follow-through all look steady right now.',
      filter: 'all',
      area: 'guests',
      ctaLabel: 'Open guest list',
      taskLabel: 'Guest ops is healthy',
    });
  }

  let tone: GuestOpsCoachSummary['tone'] = 'healthy';
  let statusLabel = 'Healthy';
  if (actions[0]?.id === 'healthy') {
    tone = snapshot.totalGuests === 0 ? 'steady' : 'healthy';
    statusLabel = snapshot.totalGuests === 0 ? 'Getting started' : 'Healthy';
  } else if (readinessScore < 65 || snapshot.pendingWithoutEmail > 0 || snapshot.noContact > 0) {
    tone = 'urgent';
    statusLabel = 'Needs attention';
  } else {
    tone = 'steady';
    statusLabel = 'In progress';
  }

  const summary = actions[0]?.id === 'healthy'
    ? buildHealthyGuestSummary(snapshot)
    : `${actions[0].title} is the best next move. After that, ${actions.slice(1, 3).map((action) => action.title.toLowerCase()).join(' and ') || 'the rest of the guest lane should feel calmer'}.`;

  return {
    readinessScore,
    tone,
    statusLabel,
    summary,
    actions,
    primaryAction: actions[0] ?? null,
  };
}

export function buildMessageOpsCoach(guestSnapshot: GuestOpsSnapshot, messageSnapshot: MessageOpsSnapshot): MessageOpsCoachSummary {
  const plays: MessageOpsCoachPlay[] = [];

  if (messageSnapshot.partialCount > 0) {
    plays.push({
      id: 'review-partial',
      status: 'review',
      title: 'Review partial delivery first',
      detail: `${messageSnapshot.partialCount} campaign${messageSnapshot.partialCount === 1 ? '' : 's'} landed partially, so review misses before sending a follow-up.`,
      actionLabel: 'Review partial',
      action: 'open-partial',
    });
  }

  if (messageSnapshot.failedCount > 0) {
    plays.push({
      id: 'review-failed',
      status: 'review',
      title: 'Check failed campaigns next',
      detail: `${messageSnapshot.failedCount} campaign${messageSnapshot.failedCount === 1 ? '' : 's'} fully failed and need either a retry or a cleaner re-send plan.`,
      actionLabel: 'Review failed',
      action: 'open-failed',
    });
  }

  if (messageSnapshot.overdueScheduledCount > 0) {
    plays.push({
      id: 'run-due-scheduled',
      status: 'ready',
      title: 'Run past-due scheduled sends',
      detail: `${messageSnapshot.overdueScheduledCount} scheduled campaign${messageSnapshot.overdueScheduledCount === 1 ? '' : 's'} are already due.`,
      actionLabel: 'Run due sends',
      action: 'run-due-scheduled',
    });
  }

  if (guestSnapshot.pendingWithoutEmail > 0 || guestSnapshot.noContact > 0) {
    const affected = guestSnapshot.pendingWithoutEmail > 0 ? guestSnapshot.pendingWithoutEmail : guestSnapshot.noContact;
    plays.push({
      id: 'collect-contact',
      status: 'blocked',
      title: 'Fix contact gaps before the next reminder',
      detail: `${affected} guest${affected === 1 ? '' : 's'} still need reachable contact details before messaging can do its job cleanly.`,
      actionLabel: 'Open guest list',
      action: 'open-guests',
    });
  }

  if (guestSnapshot.pendingResponses > 0) {
    plays.push({
      id: 'send-rsvp-reminder',
      status: 'ready',
      title: 'Load the next RSVP reminder',
      detail: `${guestSnapshot.pendingResponses} guest${guestSnapshot.pendingResponses === 1 ? '' : 's'} are still pending, so the next nudge is ready to draft.`,
      actionLabel: 'Load RSVP reminder',
      action: 'compose-rsvp-reminder',
    });
  }

  if (guestSnapshot.attendingGuests > 0 && messageSnapshot.scheduledCount === 0) {
    plays.push({
      id: 'stage-day-of-update',
      status: 'ready',
      title: 'Stage a day-of update now',
      detail: `${guestSnapshot.attendingGuests} attending guest${guestSnapshot.attendingGuests === 1 ? '' : 's'} are already in play, so a ready-to-send day-of update will save time later.`,
      actionLabel: 'Load day-of update',
      action: 'compose-day-of-update',
    });
  }

  const topPlays = plays.slice(0, 3);
  if (topPlays.length === 0) {
    return {
      pulse: 'Steady',
      summary: 'Messaging looks calm right now. Delivery review, contact coverage, and scheduled sends do not have an obvious hot spot.',
      plays: [{
        id: 'steady',
        status: 'calm',
        title: 'Messaging lane looks healthy',
        detail: messageSnapshot.unreachedRecipientCount > 0
          ? `${messageSnapshot.unreachedRecipientCount} recipient${messageSnapshot.unreachedRecipientCount === 1 ? '' : 's'} remain unreached overall, but there is no urgent send or review queue right now.`
          : 'No urgent review queue, no past-due scheduled sends, and no obvious next-send blocker are showing right now.',
        actionLabel: 'Stay steady',
        action: 'none',
      }],
    };
  }

  const pulse = topPlays.some((play) => play.status === 'review' || play.status === 'blocked')
    ? 'Needs attention'
    : 'Ready to move';
  const summary = topPlays[0].detail;

  return {
    pulse,
    summary,
    plays: topPlays,
  };
}
