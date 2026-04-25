import { describe, expect, it } from 'vitest';
import { buildNameChangePlan } from '../../lib/nameChange/engine';
import { defaultNameChangeCaseInput } from './planning/nameChangeService';
import { deriveNameChangeLifecycleStatus } from './nameChangeLifecycleStatus';

describe('deriveNameChangeLifecycleStatus', () => {
  it('treats untouched plans as ready', () => {
    const plan = buildNameChangePlan({ profile: defaultNameChangeCaseInput, documents: [], extractedFields: [] });
    expect(deriveNameChangeLifecycleStatus(plan)).toBe('ready');
  });

  it('treats any execution progress as in progress', () => {
    const base = buildNameChangePlan({ profile: defaultNameChangeCaseInput, documents: [], extractedFields: [] });
    const plan = {
      ...base,
      steps: base.steps.map((step, index) => index === 0 ? { ...step, executionStatus: 'complete' as const } : step),
      summary: {
        ...base.summary,
        executionCounts: {
          todo: Math.max(base.steps.length - 1, 0),
          in_progress: 0,
          complete: 1,
        },
      },
    };
    expect(deriveNameChangeLifecycleStatus(plan)).toBe('in_progress');
  });

  it('treats fully completed execution as complete even if blockers remain elsewhere', () => {
    const base = buildNameChangePlan({ profile: defaultNameChangeCaseInput, documents: [], extractedFields: [] });
    const plan = {
      ...base,
      steps: base.steps.map((step) => ({ ...step, executionStatus: 'complete' as const })),
      summary: {
        ...base.summary,
        executionCounts: {
          todo: 0,
          in_progress: 0,
          complete: base.steps.length,
        },
      },
    };
    expect(deriveNameChangeLifecycleStatus(plan)).toBe('complete');
  });
});
