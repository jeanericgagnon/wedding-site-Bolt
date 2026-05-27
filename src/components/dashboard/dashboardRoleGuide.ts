export type DashboardRoleGuideRole = 'owner' | 'planner' | 'coordinator' | 'viewer';

export interface DashboardRoleGuideModel {
  label: string;
  title: string;
  detail: string;
  focusTitle: string;
  focusDetail: string;
  nextMove: string;
  decisionRule: string;
  watchout: string;
  sequence: Array<{
    id: 'orient' | 'enter' | 'handoff';
    status: 'current' | 'next' | 'then';
    title: string;
    detail: string;
  }>;
}

export function buildDashboardRoleGuide(role: DashboardRoleGuideRole): DashboardRoleGuideModel {
  if (role === 'planner') {
    return {
      label: 'Planner handoff',
      title: 'You are in the broader planning workspace',
      detail: 'Guests, planning, messages, seating, and live-day tools are open here. Couple-only controls stay out of the way so the working view feels cleaner.',
      focusTitle: 'Move the plan forward, not the brand surface',
      focusDetail: 'This view is strongest when you use it to clear guest, planning, and logistics pressure without reopening owner-only polish decisions.',
      nextMove: 'Start in Overview, then move into Guests, Planning, or Messages depending on which operational pressure is actually loudest.',
      decisionRule: 'If a task changes wedding operations, handle it here. If it changes the couple’s brand, billing, or final ownership calls, leave it with the couple.',
      watchout: 'Do not let operational help turn into slow owner-call churn. If the next decision changes billing, brand voice, or final ownership truth, narrow the escalation instead of broadening the whole lane.',
      sequence: [
        {
          id: 'orient',
          status: 'current',
          title: 'Find the operational pressure',
          detail: 'Use Overview first so you can tell whether guest health, planning load, or outreach pressure deserves the next pass.',
        },
        {
          id: 'enter',
          status: 'next',
          title: 'Clear the working lane directly',
          detail: 'Move into Guests, Planning, or Messages and resolve the real operational backlog instead of circling brand-level polish.',
        },
        {
          id: 'handoff',
          status: 'then',
          title: 'Hand owner calls back cleanly',
          detail: 'When the next blocker changes billing, brand, or final ownership truth, escalate only that decision instead of broadening the lane.',
        },
      ],
    };
  }

  if (role === 'coordinator') {
    return {
      label: 'Coordinator handoff',
      title: 'You are in the live operations view',
      detail: 'This workspace favors check-in, updates, seating stability, and day-of coordination so the operational path stays obvious under pressure.',
      focusTitle: 'Protect the live path first',
      focusDetail: 'Use this view to stabilize the timeline, guest movement, and communications before you spend any energy on lower-stakes cleanup.',
      nextMove: 'Start in Overview, then open Coordinator Mode or Itinerary once the real live-day pressure is visible.',
      decisionRule: 'If it affects live guest flow or day-of calm, handle it now. If it can wait until after the pressure passes, let it wait.',
      watchout: 'Do not absorb broader planning truth while the room is under pressure. If a choice will outlive the live window, capture it and return it after the floor is calm.',
      sequence: [
        {
          id: 'orient',
          status: 'current',
          title: 'Spot the live pressure',
          detail: 'Use Overview first so you can tell whether the room needs timeline clarity, guest movement help, or live messaging.',
        },
        {
          id: 'enter',
          status: 'next',
          title: 'Enter the live control lane',
          detail: 'Move into Coordinator Mode or Itinerary and settle the pressure that is actively shaping the guest experience.',
        },
        {
          id: 'handoff',
          status: 'then',
          title: 'Let calm stay calm',
          detail: 'After the live lane is steady, only reopen lower-pressure cleanup if the room truly has space for it.',
        },
      ],
    };
  }

  if (role === 'viewer') {
    return {
      label: 'Read-only handoff',
      title: 'You are in a calm review view',
      detail: 'The important wedding details stay visible here without exposing editing controls that would blur ownership.',
      focusTitle: 'Review for clarity, not control',
      focusDetail: 'This mode works best when someone needs shared visibility without the risk of accidental edits or fuzzy ownership.',
      nextMove: 'Start in Overview, then open the relevant page to confirm facts or collect questions without turning this into an editing lane.',
      decisionRule: 'Use this view to confirm details and surface questions, not to become another editing lane.',
      watchout: 'Do not let read-only review become shadow ownership. If something feels wrong, route the question back clearly instead of quietly becoming the person who carries the fix.',
      sequence: [
        {
          id: 'orient',
          status: 'current',
          title: 'Read the wedding story first',
          detail: 'Start in Overview so the broader wedding state is clear before you zoom into one surface.',
        },
        {
          id: 'enter',
          status: 'next',
          title: 'Confirm the specific facts',
          detail: 'Open the relevant page, verify details, and gather questions without turning read-only access into editing work.',
        },
        {
          id: 'handoff',
          status: 'then',
          title: 'Return uncertainty to the owners',
          detail: 'Surface unclear details back to the couple instead of improvising changes from a review lane.',
        },
      ],
    };
  }

  return {
    label: 'Couple owner',
    title: 'You are in the full wedding control view',
    detail: 'This is the complete workspace for launch, guest communication, planning, and collaborator handoff when you need it.',
    focusTitle: 'Own the final calls',
    focusDetail: 'This view is where cross-surface decisions come together: launch, guest trust, collaboration, and the final version of the wedding story.',
    nextMove: 'Start in Overview, then open the exact surface where the next cross-cutting decision will actually be resolved.',
    decisionRule: 'If a decision changes multiple surfaces or changes who owns the work, resolve it here first.',
    watchout: 'Do not scatter source-of-truth decisions across helper lanes. If a change affects launch, access, or final wedding truth, settle it here before delegating the follow-through.',
    sequence: [
      {
        id: 'orient',
        status: 'current',
        title: 'Read the full board first',
        detail: 'Use Overview to see which pressure actually deserves the next owner-level call before you start moving surfaces around.',
      },
      {
        id: 'enter',
        status: 'next',
        title: 'Resolve the cross-surface decision',
        detail: 'Move into the exact workspace where launch, trust, billing, or ownership truth will be settled cleanly.',
      },
      {
        id: 'handoff',
        status: 'then',
        title: 'Let the rest of the product inherit it',
        detail: 'After the decision is made, let the other surfaces stay aligned to that truth instead of reopening it everywhere.',
      },
    ],
  };
}
