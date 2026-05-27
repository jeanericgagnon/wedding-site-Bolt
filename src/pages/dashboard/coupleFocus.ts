export interface CoupleFocusStep {
  id: 'launch' | 'planning' | 'guests' | 'seating' | 'day-of' | 'polish' | 'archive';
  status: 'current' | 'next' | 'then';
  title: string;
  detail: string;
  target: 'builder' | 'planning' | 'guests' | 'messages' | 'seating' | 'coordinator' | 'photos' | 'vault';
  ctaLabel: string;
}

export interface CoupleFocusModel {
  headline: string;
  summary: string;
  steps: CoupleFocusStep[];
}

export interface CoupleFocusInput {
  daysUntilWedding: number | null;
  isPublished: boolean;
  isArchiveLike: boolean;
  privacyMode?: 'public' | 'password_protected' | 'invite_only';
  publishBlockerCount: number;
  pendingGuestCount: number;
  contactGapCount: number;
  overdueTaskCount: number;
  dueSoonVendorCount: number;
  seatingUnassignedCount: number;
  itineraryEventCount?: number | null;
}

function step(
  status: CoupleFocusStep['status'],
  value: Omit<CoupleFocusStep, 'status'>,
): CoupleFocusStep {
  return { status, ...value };
}

function isWeddingSoon(daysUntilWedding: number | null): boolean {
  return daysUntilWedding !== null && daysUntilWedding >= 0 && daysUntilWedding <= 30;
}

export function buildCoupleFocusModel(input: CoupleFocusInput): CoupleFocusModel {
  const restrictedAccess = input.privacyMode === 'password_protected' || input.privacyMode === 'invite_only';
  const accessLabel = input.privacyMode === 'invite_only' ? 'invite-only' : 'password-protected';

  if (input.isArchiveLike) {
    return {
      headline: 'Shift from operations to keepsake mode',
      summary: 'The urgent wedding work is behind you now, so the highest-value move is turning the site into something worth revisiting.',
      steps: [
        step('current', {
          id: 'archive',
          title: 'Curate memories first',
          detail: 'The next meaningful move is collecting the best photos, notes, and recap surfaces instead of chasing more launch polish.',
          target: 'vault',
          ctaLabel: 'Open memory vault',
        }),
        step('next', {
          id: 'polish',
          title: 'Then refine the public keepsake',
          detail: 'Make the public-facing story feel warm and revisitable once the memory layer is there.',
          target: 'photos',
          ctaLabel: 'Review photos',
        }),
      ],
    };
  }

  if (!input.isPublished && input.publishBlockerCount > 0) {
    return {
      headline: 'Launch readiness is still the couple focus',
      summary: 'The right move is to finish the guest-facing basics before spending more time on secondary polish or planning extras.',
      steps: [
        step('current', {
          id: 'launch',
          title: 'Clear the launch blockers',
          detail: `${input.publishBlockerCount} guest-facing blocker${input.publishBlockerCount === 1 ? '' : 's'} still stand between this draft and a confident launch.`,
          target: 'builder',
          ctaLabel: 'Open launch checklist',
        }),
        step('next', {
          id: 'guests',
          title: 'Then tighten the guest path',
          detail: input.pendingGuestCount > 0 || input.contactGapCount > 0
            ? 'Use the next pass to make RSVP reachability and guest guidance feel calm before you go live.'
            : 'Once the blockers are gone, make sure the guest path feels trustworthy on a phone.',
          target: 'guests',
          ctaLabel: 'Review guest path',
        }),
        step('then', {
          id: 'planning',
          title: 'Then return to planning pressure',
          detail: 'Only after the launch lane is stable should you spend more energy on the broader planning board.',
          target: 'planning',
          ctaLabel: 'Open planning',
        }),
      ],
    };
  }

  if (input.overdueTaskCount > 0 || input.dueSoonVendorCount > 0) {
    return {
      headline: 'Planning pressure is the main couple focus',
      summary: 'The site is not the thing slipping now. Clearing the operational pressure will buy back more calm than more website tweaks.',
      steps: [
        step('current', {
          id: 'planning',
          title: input.overdueTaskCount > 0 ? 'Clear the overdue work first' : 'Handle the next vendor deadline first',
          detail: input.overdueTaskCount > 0
            ? `${input.overdueTaskCount} planning task${input.overdueTaskCount === 1 ? '' : 's'} already need attention.`
            : `${input.dueSoonVendorCount} vendor payment${input.dueSoonVendorCount === 1 ? '' : 's'} land within the next week.`,
          target: 'planning',
          ctaLabel: 'Open planning',
        }),
        step('next', {
          id: 'guests',
          title: 'Then check the guest lane',
          detail: input.pendingGuestCount > 0 || input.contactGapCount > 0
            ? 'Once the planning pressure is calmer, the next question is whether guests are still waiting on you.'
            : 'Once the planning pressure is calmer, make sure the guest lane still looks steady.',
          target: 'guests',
          ctaLabel: 'Review guests',
        }),
        step('then', {
          id: 'polish',
          title: 'Then use polish as a reward, not a detour',
          detail: 'That is the moment for copy and visual polish, not while real deadlines are still pulling focus.',
          target: 'builder',
          ctaLabel: 'Return to builder',
        }),
      ],
    };
  }

  if (input.pendingGuestCount > 0 || input.contactGapCount > 0) {
    return {
      headline: 'Guest follow-through is the main couple focus',
      summary: 'The right next move is guest confidence, not more internal tweaking.',
      steps: [
        step('current', {
          id: 'guests',
          title: input.contactGapCount > 0 ? 'Close the contact gaps first' : 'Send the next RSVP nudge',
          detail: input.contactGapCount > 0
            ? `${input.contactGapCount} guest${input.contactGapCount === 1 ? '' : 's'} still are not directly reachable.`
            : `${input.pendingGuestCount} guest${input.pendingGuestCount === 1 ? '' : 's'} are still pending a response.`,
          target: input.contactGapCount > 0 ? 'guests' : 'messages',
          ctaLabel: input.contactGapCount > 0 ? 'Fix guest contacts' : 'Open messages',
        }),
        step('next', {
          id: 'seating',
          title: 'Then finish any live guest details',
          detail: 'Once the guest lane is steadier, seating and day-of readiness become much easier to trust.',
          target: input.seatingUnassignedCount > 0 ? 'seating' : 'coordinator',
          ctaLabel: input.seatingUnassignedCount > 0 ? 'Check seating' : 'Open coordinator mode',
        }),
        step('then', {
          id: 'polish',
          title: 'Then return to polish with confidence',
          detail: 'That is when the site polish actually helps instead of covering for unanswered guest basics.',
          target: 'builder',
          ctaLabel: 'Open builder',
        }),
      ],
    };
  }

  if (input.seatingUnassignedCount > 0 && isWeddingSoon(input.daysUntilWedding)) {
    return {
      headline: 'The room itself is the couple focus now',
      summary: 'The guest list is calm enough that the next stress saver is finishing the live room, not polishing more static surfaces.',
      steps: [
        step('current', {
          id: 'seating',
          title: 'Finish seating while the board is calm',
          detail: `${input.seatingUnassignedCount} attending guest${input.seatingUnassignedCount === 1 ? '' : 's'} still need a place before the room feels done.`,
          target: 'seating',
          ctaLabel: 'Open seating',
        }),
        step('next', {
          id: 'day-of',
          title: 'Then check live readiness',
          detail: 'Once the room is settled, the next useful pass is coordinator mode and day-of timing.',
          target: 'coordinator',
          ctaLabel: 'Open coordinator mode',
        }),
      ],
    };
  }

  if (isWeddingSoon(input.daysUntilWedding) && input.itineraryEventCount === 0) {
    return {
      headline: 'Guests still need a real weekend timeline to trust',
      summary: 'The date is close enough now that schedule clarity matters more than another polish pass. Give guests a clean itinerary spine before asking the live layer to do extra work.',
      steps: [
        step('current', {
          id: 'planning',
          title: 'Add the anchor itinerary events',
          detail: 'Start with the ceremony, reception, and any guest-facing welcome or farewell events so the weekend stops feeling implied.',
          target: 'planning',
          ctaLabel: 'Open planning',
        }),
        step('next', {
          id: 'launch',
          title: 'Preview the guest-facing schedule',
          detail: 'Once the anchors are in, check the public timeline and make sure guests can understand the flow without asking you to decode it.',
          target: 'builder',
          ctaLabel: 'Open builder',
        }),
        step('then', {
          id: 'day-of',
          title: 'Then return to live readiness',
          detail: 'With the schedule in place, coordinator mode and updates become support tools instead of backup explanations.',
          target: 'coordinator',
          ctaLabel: 'Open coordinator mode',
        }),
      ],
    };
  }

  if (input.isPublished && isWeddingSoon(input.daysUntilWedding) && restrictedAccess) {
    return {
      headline: 'Guest access is the couple focus now',
      summary: `The site is live, but it is ${accessLabel}. The next trust move is making sure the right password or invite path travels with every guest-facing handoff.`,
      steps: [
        step('current', {
          id: 'launch',
          title: 'Preview the real guest access flow',
          detail: input.privacyMode === 'invite_only'
            ? 'Open the live flow the same way a guest will, then make sure the invite path is what your reminders and handoff assets actually point to.'
            : 'Check the live flow with the password gate in mind so links, print packs, and reminders all carry the right instructions.',
          target: 'builder',
          ctaLabel: 'Open builder',
        }),
        step('next', {
          id: 'guests',
          title: 'Then align reminders and handoff language',
          detail: 'Once the access path feels steady, make sure guest outreach and handoff surfaces are using the same instructions.',
          target: 'messages',
          ctaLabel: 'Open messages',
        }),
        step('then', {
          id: 'day-of',
          title: 'Then return to live readiness',
          detail: 'With access truth aligned, coordinator and day-of surfaces can take the lead again.',
          target: 'coordinator',
          ctaLabel: 'Open coordinator mode',
        }),
      ],
    };
  }

  if (isWeddingSoon(input.daysUntilWedding)) {
    return {
      headline: 'Stay close to live readiness now',
      summary: 'The biggest value now is staying near the surfaces that reduce day-of surprise, not inventing more work.',
      steps: [
        step('current', {
          id: 'day-of',
          title: 'Keep the live layer calm',
          detail: 'This is the moment to stay close to coordinator mode, updates, and anything guests will feel in real time.',
          target: 'coordinator',
          ctaLabel: 'Open coordinator mode',
        }),
        step('next', {
          id: 'polish',
          title: 'Then use polish very selectively',
          detail: 'Only make changes that clearly reduce guest confusion or day-of friction.',
          target: 'builder',
          ctaLabel: 'Open builder',
        }),
      ],
    };
  }

  return {
    headline: 'You have room to make thoughtful quality moves',
    summary: 'Nothing is shouting for rescue right now, so this is the right moment to improve the guest-facing experience deliberately.',
    steps: [
      step('current', {
        id: 'polish',
        title: 'Strengthen the guest-facing quality',
        detail: 'Use this calm window to make the site feel clearer, warmer, and easier to trust.',
        target: 'builder',
        ctaLabel: 'Open builder',
      }),
      step('next', {
        id: 'planning',
        title: 'Then keep the planning board honest',
        detail: 'A quick planning pass after that keeps tasks, vendors, and budget from quietly drifting.',
        target: 'planning',
        ctaLabel: 'Open planning',
      }),
      step('then', {
        id: 'guests',
        title: 'Then spot-check the guest lane',
        detail: 'That makes sure the calm is real and not just hiding in one part of the product.',
        target: 'guests',
        ctaLabel: 'Review guests',
      }),
    ],
  };
}
