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

export interface GuestOutreachSequenceStep {
  id: 'import-guests' | 'close-contact-gaps' | 'send-rsvp-reminder' | 'close-rsvp-cleanup' | 'review-delivery' | 'stage-day-of-update' | 'steady';
  status: 'current' | 'next' | 'then' | 'steady';
  title: string;
  detail: string;
  area: 'guests' | 'messages';
  filter?: GuestOpsCoachAction['filter'];
  playAction?: MessageOpsCoachPlay['action'];
  ctaLabel: string;
}

export interface GuestOutreachSequence {
  headline: string;
  summary: string;
  steps: GuestOutreachSequenceStep[];
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

function buildOutreachStep(
  status: GuestOutreachSequenceStep['status'],
  step: Omit<GuestOutreachSequenceStep, 'status'>,
): GuestOutreachSequenceStep {
  return { status, ...step };
}

export function buildGuestOutreachSequence(
  guestSnapshot: GuestOpsSnapshot,
  messageSnapshot: MessageOpsSnapshot,
): GuestOutreachSequence {
  const steps: GuestOutreachSequenceStep[] = [];

  if (guestSnapshot.totalGuests === 0) {
    steps.push(
      buildOutreachStep('current', {
        id: 'import-guests',
        title: 'Bring in the guest list first',
        detail: 'Everything else gets calmer once the real guest list is here.',
        area: 'guests',
        filter: 'all',
        ctaLabel: 'Open guest list',
      }),
      buildOutreachStep('next', {
        id: 'close-contact-gaps',
        title: 'Fill in email and phone coverage',
        detail: 'Contact coverage is what unlocks clean reminders and day-of updates.',
        area: 'guests',
        filter: 'no-contact',
        ctaLabel: 'Prepare contact coverage',
      }),
      buildOutreachStep('then', {
        id: 'send-rsvp-reminder',
        title: 'Load the first RSVP reminder',
        detail: 'Once contacts are in place, DayOf can draft the first follow-up for you.',
        area: 'messages',
        playAction: 'compose-rsvp-reminder',
        ctaLabel: 'Open message composer',
      }),
    );

    return {
      headline: 'Start the outreach lane',
      summary: 'Get the list in, close contact gaps, then let messaging take over the first RSVP push.',
      steps,
    };
  }

  if (guestSnapshot.pendingWithoutEmail > 0 || guestSnapshot.noContact > 0) {
    steps.push(
      buildOutreachStep('current', {
        id: 'close-contact-gaps',
        title: 'Close contact gaps before sending again',
        detail: guestSnapshot.pendingWithoutEmail > 0
          ? `${guestSnapshot.pendingWithoutEmail} pending guest${guestSnapshot.pendingWithoutEmail === 1 ? '' : 's'} still cannot receive an RSVP reminder.`
          : `${guestSnapshot.noContact} guest${guestSnapshot.noContact === 1 ? '' : 's'} still have no email or phone on file.`,
        area: 'guests',
        filter: guestSnapshot.pendingWithoutEmail > 0 ? 'pending-no-email' : 'no-contact',
        ctaLabel: 'Review guest gaps',
      }),
    );

    if (guestSnapshot.pendingResponses > 0) {
      steps.push(buildOutreachStep('next', {
        id: 'send-rsvp-reminder',
        title: 'Then load the next RSVP reminder',
        detail: `${guestSnapshot.pendingResponses} guest${guestSnapshot.pendingResponses === 1 ? '' : 's'} are still waiting on a nudge.`,
        area: 'messages',
        playAction: 'compose-rsvp-reminder',
        ctaLabel: 'Load RSVP reminder',
      }));
    }

    steps.push(buildOutreachStep('then', {
      id: 'stage-day-of-update',
      title: 'Stage the day-of update once the list is reachable',
      detail: guestSnapshot.attendingGuests > 0
        ? `${guestSnapshot.attendingGuests} attending guest${guestSnapshot.attendingGuests === 1 ? '' : 's'} will be easier to support once the contact lane is clean.`
        : 'That keeps the live communications lane ready once RSVPs settle down.',
      area: 'messages',
      playAction: 'compose-day-of-update',
      ctaLabel: 'Stage day-of update',
    }));

    return {
      headline: 'Unlock clean outreach first',
      summary: 'This is still mostly a list-quality problem, not a send-timing problem.',
      steps,
    };
  }

  if (messageSnapshot.partialCount > 0 || messageSnapshot.failedCount > 0 || messageSnapshot.overdueScheduledCount > 0) {
    steps.push(
      buildOutreachStep('current', {
        id: 'review-delivery',
        title: 'Review delivery health before another send',
        detail: messageSnapshot.partialCount > 0
          ? `${messageSnapshot.partialCount} campaign${messageSnapshot.partialCount === 1 ? '' : 's'} landed partially and should be reviewed first.`
          : messageSnapshot.failedCount > 0
            ? `${messageSnapshot.failedCount} failed campaign${messageSnapshot.failedCount === 1 ? '' : 's'} need a cleaner retry plan.`
            : `${messageSnapshot.overdueScheduledCount} scheduled campaign${messageSnapshot.overdueScheduledCount === 1 ? '' : 's'} are already due.`,
        area: 'messages',
        playAction: messageSnapshot.partialCount > 0
          ? 'open-partial'
          : messageSnapshot.failedCount > 0
            ? 'open-failed'
            : 'run-due-scheduled',
        ctaLabel: messageSnapshot.overdueScheduledCount > 0 && messageSnapshot.partialCount === 0 && messageSnapshot.failedCount === 0
          ? 'Run due sends'
          : 'Review delivery',
      }),
    );

    if (guestSnapshot.pendingResponses > 0) {
      steps.push(buildOutreachStep('next', {
        id: 'send-rsvp-reminder',
        title: 'Then reload the RSVP follow-up',
        detail: `${guestSnapshot.pendingResponses} pending guest${guestSnapshot.pendingResponses === 1 ? '' : 's'} still need a clean reminder after the delivery review.`,
        area: 'messages',
        playAction: 'compose-rsvp-reminder',
        ctaLabel: 'Load reminder next',
      }));
    }

    steps.push(buildOutreachStep('then', {
      id: 'stage-day-of-update',
      title: 'Keep the day-of update staged behind it',
      detail: 'That way the live lane is ready once delivery health is steady again.',
      area: 'messages',
      playAction: 'compose-day-of-update',
      ctaLabel: 'Stage update',
    }));

    return {
      headline: 'Review the send lane before adding volume',
      summary: 'Messaging has enough signal now to tell us cleanup comes before another big push.',
      steps,
    };
  }

  if (guestSnapshot.pendingResponses > 0) {
    steps.push(
      buildOutreachStep('current', {
        id: 'send-rsvp-reminder',
        title: 'Send the next RSVP reminder now',
        detail: `${guestSnapshot.pendingResponses} guest${guestSnapshot.pendingResponses === 1 ? '' : 's'} are still pending and the list is clean enough to nudge.`,
        area: 'messages',
        playAction: 'compose-rsvp-reminder',
        ctaLabel: 'Load RSVP reminder',
      }),
    );

    if (guestSnapshot.missingMealChoices > 0 || guestSnapshot.missingPlusOneNames > 0 || (guestSnapshot.manualFollowUp ?? 0) > 0) {
      const cleanupCount = guestSnapshot.missingMealChoices + guestSnapshot.missingPlusOneNames + (guestSnapshot.manualFollowUp ?? 0);
      steps.push(buildOutreachStep('next', {
        id: 'close-rsvp-cleanup',
        title: 'Then close the RSVP cleanup queue',
        detail: `${cleanupCount} RSVP follow-up item${cleanupCount === 1 ? '' : 's'} still need a meal, plus-one, or manual resolution pass.`,
        area: 'guests',
        filter: guestSnapshot.missingMealChoices > 0
          ? 'missing-meal'
          : guestSnapshot.missingPlusOneNames > 0
            ? 'plusone-missing'
            : 'manual-follow-up',
        ctaLabel: 'Review cleanup queue',
      }));
    }

    steps.push(buildOutreachStep('then', {
      id: 'stage-day-of-update',
      title: 'Keep the live update ready behind it',
      detail: guestSnapshot.attendingGuests > 0
        ? `${guestSnapshot.attendingGuests} attending guest${guestSnapshot.attendingGuests === 1 ? '' : 's'} already justify a ready-to-send day-of note.`
        : 'That keeps the last-mile guest communications lane calm as replies come in.',
      area: 'messages',
      playAction: 'compose-day-of-update',
      ctaLabel: 'Stage day-of update',
    }));

    return {
      headline: 'The list is ready for the next nudge',
      summary: 'You are past contact cleanup, so the fastest win now is sending the next RSVP push and only then tidying the exceptions.',
      steps,
    };
  }

  if (guestSnapshot.missingMealChoices > 0 || guestSnapshot.missingPlusOneNames > 0 || (guestSnapshot.manualFollowUp ?? 0) > 0) {
    const cleanupCount = guestSnapshot.missingMealChoices + guestSnapshot.missingPlusOneNames + (guestSnapshot.manualFollowUp ?? 0);
    steps.push(
      buildOutreachStep('current', {
        id: 'close-rsvp-cleanup',
        title: 'Finish the RSVP cleanup pass',
        detail: `${cleanupCount} response detail${cleanupCount === 1 ? '' : 's'} still need a final meal, plus-one, or manual follow-up pass.`,
        area: 'guests',
        filter: guestSnapshot.missingMealChoices > 0
          ? 'missing-meal'
          : guestSnapshot.missingPlusOneNames > 0
            ? 'plusone-missing'
            : 'manual-follow-up',
        ctaLabel: 'Review response gaps',
      }),
      buildOutreachStep('next', {
        id: 'stage-day-of-update',
        title: 'Then prep the day-of update',
        detail: 'Once the response details are clean, the live communications lane can stay lightweight.',
        area: 'messages',
        playAction: 'compose-day-of-update',
        ctaLabel: 'Stage update',
      }),
    );

    return {
      headline: 'Close the last RSVP details',
      summary: 'This is detail cleanup now, not a list-building problem anymore.',
      steps,
    };
  }

  if (guestSnapshot.attendingGuests > 0 && messageSnapshot.scheduledCount === 0) {
    steps.push(
      buildOutreachStep('current', {
        id: 'stage-day-of-update',
        title: 'Stage the day-of update while the lane is calm',
        detail: `${guestSnapshot.attendingGuests} attending guest${guestSnapshot.attendingGuests === 1 ? '' : 's'} are already in the live lane, so getting the day-of update ready now buys you calm later.`,
        area: 'messages',
        playAction: 'compose-day-of-update',
        ctaLabel: 'Load day-of update',
      }),
      buildOutreachStep('next', {
        id: 'steady',
        title: 'Then let the list stay steady',
        detail: 'No hot RSVP or contact cleanup queue is competing for attention right now.',
        area: 'guests',
        filter: 'all',
        ctaLabel: 'Keep list steady',
      }),
    );

    return {
      headline: 'You can work ahead now',
      summary: 'The list is calm enough that proactive live-update prep is the smartest next move.',
      steps,
    };
  }

  return {
    headline: 'Guest outreach looks calm',
    summary: 'Nothing in the list or send lane is asking for urgent attention right now.',
    steps: [
      buildOutreachStep('steady', {
        id: 'steady',
        title: 'Stay in a healthy holding pattern',
        detail: messageSnapshot.unreachedRecipientCount > 0
          ? `${messageSnapshot.unreachedRecipientCount} recipient${messageSnapshot.unreachedRecipientCount === 1 ? '' : 's'} remain unreached overall, but there is no urgent fix queue right now.`
          : 'Contacts, RSVPs, and send timing are all in a stable place right now.',
        area: 'guests',
        filter: 'all',
        ctaLabel: 'Review guest list',
      }),
    ],
  };
}
