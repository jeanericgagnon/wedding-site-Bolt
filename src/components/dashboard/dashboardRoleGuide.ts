export type DashboardRoleGuideRole = 'owner' | 'planner' | 'coordinator' | 'viewer';

export interface DashboardRoleGuideModel {
  label: string;
  title: string;
  detail: string;
}

export function buildDashboardRoleGuide(role: DashboardRoleGuideRole): DashboardRoleGuideModel {
  if (role === 'planner') {
    return {
      label: 'Planner handoff',
      title: 'You are in the broader planning workspace',
      detail: 'Guests, planning, messages, seating, and live-day tools are open here. Couple-only controls stay out of the way so the working view feels cleaner.',
    };
  }

  if (role === 'coordinator') {
    return {
      label: 'Coordinator handoff',
      title: 'You are in the live operations view',
      detail: 'This workspace favors check-in, updates, seating stability, and day-of coordination so the operational path stays obvious under pressure.',
    };
  }

  if (role === 'viewer') {
    return {
      label: 'Read-only handoff',
      title: 'You are in a calm review view',
      detail: 'The important wedding details stay visible here without exposing editing controls that would blur ownership.',
    };
  }

  return {
    label: 'Couple owner',
    title: 'You are in the full wedding control view',
    detail: 'This is the complete workspace for launch, guest communication, planning, and collaborator handoff when you need it.',
  };
}
