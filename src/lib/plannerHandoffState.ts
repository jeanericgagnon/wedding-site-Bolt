import type { PlannerAccessRole } from './plannerAccess';

export type PlannerHandoffSurface = 'guests' | 'planning' | 'messages' | 'coordinator';

export interface PlannerHandoffModel {
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

function getSurfaceDetail(surface: PlannerHandoffSurface) {
  switch (surface) {
    case 'guests':
      return 'guest readiness, response cleanup, and who still needs follow-up';
    case 'planning':
      return 'tasks, vendors, budget, and event execution';
    case 'messages':
      return 'guest communications, reminders, and day-of updates';
    case 'coordinator':
    default:
      return 'guest-facing movement, timeline decisions, and day-of updates';
  }
}

export function getPlannerHandoffCopy(role: PlannerAccessRole, surface: PlannerHandoffSurface = 'planning'): PlannerHandoffModel {
  const surfaceDetail = getSurfaceDetail(surface);

  if (role === 'owner') {
    return {
      title: 'Couple-led right now',
      detail: 'The couple still has the wheel. Planner help can support execution, but final direction stays here.',
      focusTitle: 'Keep final ownership with the couple',
      focusDetail: `Use collaborator help to move ${surfaceDetail} forward without blurring who makes the final call.`,
      nextMove: 'Start in Overview, then open the exact working surface where the final couple decision will actually get resolved.',
      decisionRule: 'If the choice changes ownership, brand, billing, or final guest-facing truth, the couple resolves it here.',
      watchout: 'If owner-level calls get settled casually inside helper lanes, the team may move faster for a moment but the wedding will stop having one trusted source of truth.',
      sequence: [
        {
          id: 'orient',
          status: 'current',
          title: 'Read the broader board first',
          detail: `Use Overview to see how ${surfaceDetail} is interacting with the rest of the wedding before you make the owner call.`,
        },
        {
          id: 'enter',
          status: 'next',
          title: 'Resolve the exact owner decision',
          detail: 'Move into the working surface where the final launch, trust, or ownership call will actually be settled.',
        },
        {
          id: 'handoff',
          status: 'then',
          title: 'Let the helpers inherit the answer',
          detail: 'Once the couple-level truth is clear, hand execution back without reopening the decision everywhere else.',
        },
      ],
    };
  }
  if (role === 'planner') {
    return {
      title: 'Planner actively driving this surface',
      detail: 'The planner can move wedding operations forward here while the couple keeps final ownership.',
      focusTitle: 'Move the working lane without reopening ownership',
      focusDetail: `This surface is strongest when the planner keeps ${surfaceDetail} moving while leaving final brand and ownership calls with the couple.`,
      nextMove: `Start with the loudest pressure inside ${surfaceDetail}, then escalate only the calls that truly need couple-level direction.`,
      decisionRule: 'Advance execution here; escalate only the choices that truly need couple-level direction.',
      watchout: 'The easiest way to slow the planner lane down is turning every hard execution call into a pseudo-owner decision before the real blocker is even clear.',
      sequence: [
        {
          id: 'orient',
          status: 'current',
          title: 'Find the loudest operational pressure',
          detail: `Scan ${surfaceDetail} for the concrete backlog that is actually slowing the wedding down right now.`,
        },
        {
          id: 'enter',
          status: 'next',
          title: 'Clear the working lane directly',
          detail: 'Handle the execution work here first instead of drifting into brand or ownership-level decisions.',
        },
        {
          id: 'handoff',
          status: 'then',
          title: 'Escalate only the true owner calls',
          detail: 'When the next blocker changes final truth instead of execution, hand that piece back cleanly.',
        },
      ],
    };
  }
  if (role === 'coordinator') {
    return {
      title: 'Coordinator handling live operations',
      detail: 'This view is for real-time event support, not broad planning ownership.',
      focusTitle: 'Protect guest-facing flow over broad editing',
      focusDetail: `Use this lane to stabilize ${surfaceDetail} in real time without reopening wider planning or ownership decisions.`,
      nextMove: 'Start with the day-of pressure that guests can already feel, then hand broader planning truth back once the moment is calm.',
      decisionRule: 'If it affects guest-facing flow, handle it now. If it changes broader ownership or planning truth, hand it back.',
      watchout: 'If the coordinator lane absorbs broader planning truth during day-of pressure, guests lose calm now and the team loses clarity later.',
      sequence: [
        {
          id: 'orient',
          status: 'current',
          title: 'Find the day-of pressure guests can feel',
          detail: `Start with the piece of ${surfaceDetail} that is already shaping the guest-facing experience.`,
        },
        {
          id: 'enter',
          status: 'next',
          title: 'Stabilize the active lane',
          detail: 'Use this surface to calm the real-time pressure before you reopen any broader planning questions.',
        },
        {
          id: 'handoff',
          status: 'then',
          title: 'Return broader truth once calm is back',
          detail: 'After the active lane is steady, hand planning or ownership-level changes back instead of absorbing them here.',
        },
      ],
    };
  }
  return {
    title: 'Viewer access only',
    detail: 'This person can review the plan, but decision-making and edits stay with the couple or planner.',
    focusTitle: 'Use this view for clarity, not control',
    focusDetail: `Keep ${surfaceDetail} visible for review and context while leaving real edits and decisions with the working owner.`,
    nextMove: 'Use this surface to confirm facts and collect questions, then hand decisions back to the working owner.',
    decisionRule: 'Review, confirm, and raise questions here; do not turn viewer access into another editing lane.',
    watchout: 'The quiet failure mode here is good intentions: once review access starts quietly changing the work, nobody knows who is really carrying the lane.',
    sequence: [
      {
        id: 'orient',
        status: 'current',
        title: 'Read the surface for context',
        detail: `Use ${surfaceDetail} to understand the current state before you react to one isolated detail.`,
      },
      {
        id: 'enter',
        status: 'next',
        title: 'Confirm the facts you need',
        detail: 'Review the details, note what is clear, and collect open questions without turning this into editing work.',
      },
      {
        id: 'handoff',
        status: 'then',
        title: 'Return decisions to the working owner',
        detail: 'Send questions or uncertainty back to the person carrying the lane instead of improvising changes here.',
      },
    ],
  };
}
