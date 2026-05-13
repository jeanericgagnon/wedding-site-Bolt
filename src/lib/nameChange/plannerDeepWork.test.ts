import { describe, expect, it } from 'vitest';
import { defaultNameChangeCaseInput } from '../../pages/dashboard/planning/nameChangeService';
import { buildNameChangePlan } from './engine';
import { buildNameChangePlannerExports, resolveNameChangeStatePlaybook } from './plannerDeepWork';
import type { NameChangeCaseInput } from './types';

function makeDraft(overrides: Partial<NameChangeCaseInput> = {}): NameChangeCaseInput {
  return {
    ...defaultNameChangeCaseInput,
    current_first_name: 'Taylor',
    current_middle_name: 'Marie',
    current_last_name: 'Smith',
    target_first_name: 'Taylor',
    target_middle_name: 'Quinn',
    target_last_name: 'Jordan',
    county_residence: 'San Diego',
    marriage_date: '2026-04-20',
    structured_intake: {
      ...defaultNameChangeCaseInput.structured_intake,
      spouseLastName: 'Jordan',
    },
    ...overrides,
  };
}

describe('plannerDeepWork', () => {
  it('resolves expanded non-California playbooks for supported marriage jurisdictions', () => {
    const playbook = resolveNameChangeStatePlaybook(makeDraft({ marriage_state: 'Nevada' }));

    expect(playbook.matchedStateLabel).toBe('Nevada');
    expect(playbook.supportLevel).toBe('expanded');
    expect(playbook.supportLabel).toBe('Expanded Nevada guidance');
    expect(playbook.officeLabel).toContain('Nevada');
  });

  it('falls back to general jurisdiction guidance for unmatched states', () => {
    const playbook = resolveNameChangeStatePlaybook(makeDraft({ marriage_state: 'Colorado' }));

    expect(playbook.matchedStateLabel).toBe('Colorado');
    expect(playbook.supportLevel).toBe('general');
    expect(playbook.summary).toContain('Colorado');
    expect(playbook.officeDetail).toContain('Colorado');
  });

  it('builds carry-forward exports that include state playbook, downstream coverage, and dual-partner rollout', () => {
    const draft = makeDraft({
      marriage_state: 'Nevada',
      structured_intake: {
        ...makeDraft().structured_intake,
        spouseLastName: 'Jordan',
        bothPartnersChangeName: true,
      },
    });
    const plan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
    const exports = buildNameChangePlannerExports({ draft, plan, reminders: [] });

    expect(exports.map((item) => item.key)).toEqual([
      'action-packet',
      'downstream-rollout',
      'status-ledger',
      'dual-partner-rollout',
    ]);
    expect(exports.find((item) => item.key === 'action-packet')?.text).toContain('State playbook: Nevada (Expanded)');
    expect(exports.find((item) => item.key === 'downstream-rollout')?.text).toContain('Institution coverage:');
    expect(exports.find((item) => item.key === 'status-ledger')?.text).toContain('Execution ledger:');
    expect(exports.find((item) => item.key === 'dual-partner-rollout')?.text).toContain('Partner-specific tracks:');
  });
});
