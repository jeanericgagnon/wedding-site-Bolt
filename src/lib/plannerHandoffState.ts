import type { PlannerAccessRole } from './plannerAccess';

export function getPlannerHandoffCopy(role: PlannerAccessRole) {
  if (role === 'owner') {
    return {
      title: 'Couple-led right now',
      detail: 'The couple still has the wheel. Planner help can move the work along, but final direction stays here.',
    };
  }
  if (role === 'planner') {
    return {
      title: 'Planner actively driving this surface',
      detail: 'The planner can move guest and day-of work forward here while the couple keeps final ownership.',
    };
  }
  if (role === 'coordinator') {
    return {
      title: 'Coordinator supporting the live day',
      detail: 'This view is for real-time event support, not broad planning ownership.',
    };
  }
  return {
    title: 'Viewer access only',
    detail: 'This person can review the plan, but decision-making and edits stay with the couple or planner.',
  };
}
