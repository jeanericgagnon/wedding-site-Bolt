import { describe, expect, it } from 'vitest';
import {
  canComposeDashboardMessages,
  canEditPlanningBudget,
  canEditPlanningTasks,
  canEditPlanningVendors,
  canEditPlannerSurface,
  canManageGuests,
  canManagePlanning,
  canSendCoordinatorUpdates,
  derivePlannerRoleFromPermissions,
  getPlannerPermissionPreset,
  hasPlannerPermission,
  type PlannerAccessRole,
} from './plannerAccess';

describe('plannerAccess role matrix', () => {
  const roles: PlannerAccessRole[] = ['owner', 'planner', 'coordinator', 'viewer'];

  it('keeps viewer read-only across edit surfaces', () => {
    expect(canEditPlannerSurface('viewer')).toBe(false);
    expect(canManagePlanning('viewer')).toBe(false);
    expect(canEditPlanningTasks('viewer')).toBe(false);
    expect(canEditPlanningBudget('viewer')).toBe(false);
    expect(canEditPlanningVendors('viewer')).toBe(false);
    expect(canComposeDashboardMessages('viewer')).toBe(false);
    expect(canSendCoordinatorUpdates('viewer')).toBe(false);
    expect(canComposeDashboardMessages('viewer', ['messages'])).toBe(false);
    expect(canManageGuests('viewer', ['guests'])).toBe(false);
  });

  it('lets coordinators handle live ops and selected messaging but not budget or vendors', () => {
    expect(canEditPlannerSurface('coordinator')).toBe(true);
    expect(canManagePlanning('coordinator')).toBe(true);
    expect(canEditPlanningTasks('coordinator')).toBe(true);
    expect(canEditPlanningBudget('coordinator')).toBe(false);
    expect(canEditPlanningVendors('coordinator')).toBe(false);
    expect(canComposeDashboardMessages('coordinator')).toBe(true);
    expect(canSendCoordinatorUpdates('coordinator')).toBe(true);
  });

  it('lets planners operate broadly without collapsing owner-only boundaries', () => {
    expect(canEditPlannerSurface('planner')).toBe(true);
    expect(canManagePlanning('planner')).toBe(true);
    expect(canEditPlanningTasks('planner')).toBe(true);
    expect(canEditPlanningBudget('planner')).toBe(true);
    expect(canEditPlanningVendors('planner')).toBe(true);
    expect(canComposeDashboardMessages('planner')).toBe(true);
    expect(canSendCoordinatorUpdates('planner')).toBe(true);
  });

  it('keeps owner permissive across all current gates', () => {
    for (const role of roles.filter((value) => value === 'owner')) {
      expect(canEditPlannerSurface(role)).toBe(true);
      expect(canManagePlanning(role)).toBe(true);
      expect(canEditPlanningTasks(role)).toBe(true);
      expect(canEditPlanningBudget(role)).toBe(true);
      expect(canEditPlanningVendors(role)).toBe(true);
      expect(canComposeDashboardMessages(role)).toBe(true);
      expect(canSendCoordinatorUpdates(role)).toBe(true);
    }
  });
});

describe('plannerAccess permission presets', () => {
  it('derives the canonical role from each preset exactly', () => {
    expect(derivePlannerRoleFromPermissions(getPlannerPermissionPreset('planner'))).toBe('planner');
    expect(derivePlannerRoleFromPermissions(getPlannerPermissionPreset('coordinator'))).toBe('coordinator');
    expect(derivePlannerRoleFromPermissions(getPlannerPermissionPreset('viewer'))).toBe('viewer');
  });

  it('treats null permissions as owner context and empty collaborator permissions as viewer', () => {
    expect(derivePlannerRoleFromPermissions([])).toBe('viewer');
    expect(derivePlannerRoleFromPermissions(null)).toBe('owner');
    expect(derivePlannerRoleFromPermissions(undefined)).toBe('owner');
  });

  it('treats settings, budget, or vendors access as planner-level power', () => {
    expect(derivePlannerRoleFromPermissions(['settings'])).toBe('planner');
    expect(derivePlannerRoleFromPermissions(['budget'])).toBe('planner');
    expect(derivePlannerRoleFromPermissions(['vendors'])).toBe('planner');
  });

  it('treats seating or coordinator access as coordinator-level power when planner-only permissions are absent', () => {
    expect(derivePlannerRoleFromPermissions(['seating'])).toBe('coordinator');
    expect(derivePlannerRoleFromPermissions(['coordinator'])).toBe('coordinator');
    expect(derivePlannerRoleFromPermissions(['timeline', 'coordinator'])).toBe('coordinator');
  });

  it('falls back to viewer for lighter read-oriented mixes', () => {
    expect(derivePlannerRoleFromPermissions(['guests'])).toBe('viewer');
    expect(derivePlannerRoleFromPermissions(['planning', 'timeline', 'photos'])).toBe('viewer');
  });

  it('uses explicit permission arrays over broad role defaults', () => {
    expect(hasPlannerPermission('planner', ['messages'], 'messages')).toBe(true);
    expect(hasPlannerPermission('planner', ['messages'], 'budget')).toBe(false);
    expect(canEditPlanningBudget('planner', ['messages'])).toBe(false);
    expect(canComposeDashboardMessages('coordinator', ['messages'])).toBe(true);
    expect(canSendCoordinatorUpdates('coordinator', ['guests'])).toBe(false);
  });

  it('uses role presets only when no explicit permission array was loaded', () => {
    expect(canEditPlanningBudget('planner')).toBe(true);
    expect(canEditPlanningBudget('coordinator')).toBe(false);
    expect(canComposeDashboardMessages('viewer')).toBe(false);
  });
});
