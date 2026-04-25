import { describe, expect, it } from 'vitest';
import { buildNameChangePlan } from '../../lib/nameChange/engine';
import type { NameChangeCaseInput } from '../../lib/nameChange/types';
import { defaultNameChangeCaseInput } from './planning/nameChangeService';
import { buildNameChangeOverviewInsights } from './nameChangeOverviewInsights';

const baseDraft: NameChangeCaseInput = {
  ...defaultNameChangeCaseInput,
  workflow_status: 'ready',
  current_first_name: 'Alex',
  current_middle_name: '',
  current_last_name: 'Rivera',
  target_first_name: 'Alex',
  target_middle_name: '',
  target_last_name: 'Morgan',
  email: 'alex@example.com',
  phone_last4: '1234',
  county_residence: 'San Diego',
  marriage_state: 'CA',
  marriage_date: '2026-04-01',
  latest_plan_summary: null,
};

describe('buildNameChangeOverviewInsights', () => {
  it('falls back to supportive lifecycle copy when nothing is in motion yet', () => {
    const plan = buildNameChangePlan({ profile: baseDraft, documents: [], extractedFields: [] });
    const insights = buildNameChangeOverviewInsights({ plan, reminders: [] });

    expect(insights.coreChainLabel).toContain('Certificate, SSA, and DMV');
    expect(insights.followOnLabel).toContain('Passport, payroll, and tax');
    expect(insights.downstreamLabel).toContain('long-tail rollout lane');
    expect(insights.concreteResumeLabel).toContain('Certified legal proof');
    expect(insights.milestoneSummaryLabel).toBe('Milestones ready to confirm');
    expect(insights.reminderSummaryLabel).toBe('No open reminders');
  });

  it('surfaces progress, milestone confirmations, and open reminders once the vault is active', () => {
    const plan = buildNameChangePlan({ profile: baseDraft, documents: [], extractedFields: [] });
    const milestoneChecklist = (plan.summary.milestoneChecklist ?? []).map((milestone, index) =>
      index === 0 ? { ...milestone, status: 'complete' as const } : milestone,
    );
    const insights = buildNameChangeOverviewInsights({
      plan: {
        ...plan,
        summary: {
          ...plan.summary,
          executionCounts: { todo: Math.max(plan.steps.length - 2, 0), in_progress: 1, complete: 1 },
          milestoneChecklist,
        },
      },
      reminders: [
        {
          reminder_key: 'ssa-follow-up',
          label: 'Check SSA receipt',
          reason: 'Keep proof tight',
          depends_on_step_id: plan.steps[0]?.id ?? 'step-1',
          suggested_offset_days: 7,
          urgency: 'medium',
          status: 'pending',
        },
      ],
    });

    expect(insights.coreChainLabel).toBe('1 complete · 1 in progress across the legal identity chain.');
    expect(insights.followOnLabel).toContain('1 milestone confirmed');
    expect(insights.downstreamLabel).toContain('1 reminder still open');
    expect(insights.concreteResumeLabel).toBeTruthy();
    expect(insights.milestoneSummaryLabel).toBe('1 milestone confirmed');
    expect(insights.reminderSummaryLabel).toBe('1 reminder open');
  });
});
