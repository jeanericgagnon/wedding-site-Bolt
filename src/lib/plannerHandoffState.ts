import type { PlannerAccessRole } from './plannerAccess';

export type PlannerHandoffSurface = 'guests' | 'planning' | 'messages' | 'coordinator';

export interface PlannerHandoffModel {
  title: string;
  detail: string;
  focusTitle: string;
  focusDetail: string;
  nextMove: string;
  decisionRule: string;
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
      return 'live guest movement, timeline decisions, and day-of updates';
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
    };
  }
  if (role === 'coordinator') {
    return {
      title: 'Coordinator handling live operations',
      detail: 'This view is for real-time event support, not broad planning ownership.',
      focusTitle: 'Protect live flow over broad editing',
      focusDetail: `Use this lane to stabilize ${surfaceDetail} in real time without reopening wider planning or ownership decisions.`,
      nextMove: 'Start with the live pressure that guests can already feel, then hand broader planning truth back once the moment is calm.',
      decisionRule: 'If it affects live guest flow, handle it now. If it changes broader ownership or planning truth, hand it back.',
    };
  }
  return {
    title: 'Viewer access only',
    detail: 'This person can review the plan, but decision-making and edits stay with the couple or planner.',
    focusTitle: 'Use this view for clarity, not control',
    focusDetail: `Keep ${surfaceDetail} visible for review and context while leaving real edits and decisions with the working owner.`,
    nextMove: 'Use this surface to confirm facts and collect questions, then hand decisions back to the working owner.',
    decisionRule: 'Review, confirm, and raise questions here; do not turn viewer access into another editing lane.',
  };
}
