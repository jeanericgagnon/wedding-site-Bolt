export interface CollaboratorRoleGuideModel {
  label: string;
  focusTitle: string;
  focusDetail: string;
  nextMove: string;
  decisionRule: string;
}

const OWNER_GUIDE: CollaboratorRoleGuideModel = {
  label: 'Owner access',
  focusTitle: 'Own the final calls',
  focusDetail: 'Use this lane when the decision changes the wedding story, billing, launch state, or who owns the next move.',
  nextMove: 'Start from Overview, then open the surface where the decision will actually be resolved.',
  decisionRule: 'If it changes multiple surfaces or changes ownership, resolve it as an owner first.',
};

export function buildCollaboratorRoleGuide(role?: string | null): CollaboratorRoleGuideModel {
  if (role === 'planner') {
    return {
      label: 'Planner access',
      focusTitle: 'Clear planning pressure without reopening owner-only polish',
      focusDetail: 'This lane is strongest for guests, planning, messaging, seating, and day-of logistics that keep the wedding moving.',
      nextMove: 'Start in Overview, then move into Guests, Planning, or Messages depending on the pressure you need to clear first.',
      decisionRule: 'If the work changes operations, handle it here. If it changes brand, billing, or final ownership calls, leave it with the couple.',
    };
  }

  if (role === 'coordinator') {
    return {
      label: 'Coordinator access',
      focusTitle: 'Protect the live path first',
      focusDetail: 'This lane is for calm day-of operations: timeline clarity, guest movement, seating stability, and live communication.',
      nextMove: 'Land in Overview, then move into Coordinator Mode or Itinerary once the real live pressure is visible.',
      decisionRule: 'If it affects guest flow or day-of calm, treat it as urgent. If it can wait until after the pressure passes, let it wait.',
    };
  }

  if (role === 'viewer') {
    return {
      label: 'Read-only access',
      focusTitle: 'Review for clarity, not control',
      focusDetail: 'This lane is for shared visibility when someone needs to confirm details without carrying editing risk.',
      nextMove: 'Start in Overview, then open the relevant page to confirm facts or collect questions for the couple.',
      decisionRule: 'Use this lane to review and surface questions, not to become another editing path.',
    };
  }

  return OWNER_GUIDE;
}
