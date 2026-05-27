export type DashboardRoleGuideRole = 'owner' | 'planner' | 'coordinator' | 'viewer';

export interface DashboardRoleGuideModel {
  label: string;
  title: string;
  detail: string;
  focusTitle: string;
  focusDetail: string;
  decisionRule: string;
}

export function buildDashboardRoleGuide(role: DashboardRoleGuideRole): DashboardRoleGuideModel {
  if (role === 'planner') {
    return {
      label: 'Planner handoff',
      title: 'You are in the broader planning workspace',
      detail: 'Guests, planning, messages, seating, and live-day tools are open here. Couple-only controls stay out of the way so the working view feels cleaner.',
      focusTitle: 'Move the plan forward, not the brand surface',
      focusDetail: 'This view is strongest when you use it to clear guest, planning, and logistics pressure without reopening owner-only polish decisions.',
      decisionRule: 'If a task changes wedding operations, handle it here. If it changes the couple’s brand, billing, or final ownership calls, leave it with the couple.',
    };
  }

  if (role === 'coordinator') {
    return {
      label: 'Coordinator handoff',
      title: 'You are in the live operations view',
      detail: 'This workspace favors check-in, updates, seating stability, and day-of coordination so the operational path stays obvious under pressure.',
      focusTitle: 'Protect the live path first',
      focusDetail: 'Use this view to stabilize the timeline, guest movement, and communications before you spend any energy on lower-stakes cleanup.',
      decisionRule: 'If it affects live guest flow or day-of calm, handle it now. If it can wait until after the pressure passes, let it wait.',
    };
  }

  if (role === 'viewer') {
    return {
      label: 'Read-only handoff',
      title: 'You are in a calm review view',
      detail: 'The important wedding details stay visible here without exposing editing controls that would blur ownership.',
      focusTitle: 'Review for clarity, not control',
      focusDetail: 'This mode works best when someone needs shared visibility without the risk of accidental edits or fuzzy ownership.',
      decisionRule: 'Use this view to confirm details and surface questions, not to become another editing lane.',
    };
  }

  return {
    label: 'Couple owner',
    title: 'You are in the full wedding control view',
    detail: 'This is the complete workspace for launch, guest communication, planning, and collaborator handoff when you need it.',
    focusTitle: 'Own the final calls',
    focusDetail: 'This view is where cross-surface decisions come together: launch, guest trust, collaboration, and the final version of the wedding story.',
    decisionRule: 'If a decision changes multiple surfaces or changes who owns the work, resolve it here first.',
  };
}
