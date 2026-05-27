export interface CollaboratorRoleGuideModel {
  label: string;
  focusTitle: string;
  focusDetail: string;
  nextMove: string;
  decisionRule: string;
  sequence: Array<{
    id: 'orient' | 'enter' | 'escalate';
    status: 'current' | 'next' | 'then';
    title: string;
    detail: string;
  }>;
}

const OWNER_GUIDE: CollaboratorRoleGuideModel = {
  label: 'Owner access',
  focusTitle: 'Own the final calls',
  focusDetail: 'Use this lane when the decision changes the wedding story, billing, launch state, or who owns the next move.',
  nextMove: 'Start from Overview, then open the surface where the decision will actually be resolved.',
  decisionRule: 'If it changes multiple surfaces or changes ownership, resolve it as an owner first.',
  sequence: [
    {
      id: 'orient',
      status: 'current',
      title: 'Orient on the full board',
      detail: 'Start from Overview so you can see which pressure actually deserves the next owner-level call.',
    },
    {
      id: 'enter',
      status: 'next',
      title: 'Resolve the real decision lane',
      detail: 'Move into the exact surface where the launch, billing, or ownership call will be settled cleanly.',
    },
    {
      id: 'escalate',
      status: 'then',
      title: 'Hand the system back a stable truth',
      detail: 'Once the decision is made, let the working surfaces inherit that truth instead of reopening it everywhere.',
    },
  ],
};

export function buildCollaboratorRoleGuide(role?: string | null): CollaboratorRoleGuideModel {
  if (role === 'planner') {
    return {
      label: 'Planner access',
      focusTitle: 'Clear planning pressure without reopening owner-only polish',
      focusDetail: 'This lane is strongest for guests, planning, messaging, seating, and day-of logistics that keep the wedding moving.',
      nextMove: 'Start in Overview, then move into Guests, Planning, or Messages depending on the pressure you need to clear first.',
      decisionRule: 'If the work changes operations, handle it here. If it changes brand, billing, or final ownership calls, leave it with the couple.',
      sequence: [
        {
          id: 'orient',
          status: 'current',
          title: 'Find the operational pressure first',
          detail: 'Use Overview to spot whether guests, planning, or outreach is the lane that actually needs attention now.',
        },
        {
          id: 'enter',
          status: 'next',
          title: 'Clear the planning lane directly',
          detail: 'Go straight into Guests, Planning, or Messages and resolve the concrete backlog instead of circling owner polish.',
        },
        {
          id: 'escalate',
          status: 'then',
          title: 'Escalate only the true owner calls',
          detail: 'When the next blocker changes brand, billing, or final ownership truth, hand that decision back instead of absorbing it here.',
        },
      ],
    };
  }

  if (role === 'coordinator') {
    return {
      label: 'Coordinator access',
      focusTitle: 'Protect the live path first',
      focusDetail: 'This lane is for calm day-of operations: timeline clarity, guest movement, seating stability, and live communication.',
      nextMove: 'Land in Overview, then move into Coordinator Mode or Itinerary once the real live pressure is visible.',
      decisionRule: 'If it affects guest flow or day-of calm, treat it as urgent. If it can wait until after the pressure passes, let it wait.',
      sequence: [
        {
          id: 'orient',
          status: 'current',
          title: 'Find the live pressure',
          detail: 'Use Overview to see whether the room needs timeline clarity, guest movement help, or live communication first.',
        },
        {
          id: 'enter',
          status: 'next',
          title: 'Enter the live control lane',
          detail: 'Move into Coordinator Mode or Itinerary and settle the pressure that is actually shaping the guest experience now.',
        },
        {
          id: 'escalate',
          status: 'then',
          title: 'Let calmer work wait',
          detail: 'After the live lane is steady, only reopen lower-pressure follow-through if the room truly has space for it.',
        },
      ],
    };
  }

  if (role === 'viewer') {
    return {
      label: 'Read-only access',
      focusTitle: 'Review for clarity, not control',
      focusDetail: 'This lane is for shared visibility when someone needs to confirm details without carrying editing risk.',
      nextMove: 'Start in Overview, then open the relevant page to confirm facts or collect questions for the couple.',
      decisionRule: 'Use this lane to review and surface questions, not to become another editing path.',
      sequence: [
        {
          id: 'orient',
          status: 'current',
          title: 'Review the dashboard story first',
          detail: 'Start from Overview so you understand the current wedding state before zooming into one detail.',
        },
        {
          id: 'enter',
          status: 'next',
          title: 'Confirm the relevant facts',
          detail: 'Open the page you need, verify the details, and note any questions without turning the lane into editing work.',
        },
        {
          id: 'escalate',
          status: 'then',
          title: 'Return questions to the owners',
          detail: 'Bring unclear or conflicting details back to the couple instead of improvising changes from a read-only lane.',
        },
      ],
    };
  }

  return OWNER_GUIDE;
}
