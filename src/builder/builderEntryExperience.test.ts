import { describe, expect, it } from 'vitest';
import { emptySetupDraft } from '../lib/setupDraft';
import { getBuilderEntryExperience } from './builderEntryExperience';

describe('getBuilderEntryExperience', () => {
  it('uses the setup draft to personalize the no-site handoff', () => {
    const experience = getBuilderEntryExperience({
      mode: 'no-site',
      draft: {
        ...emptySetupDraft,
        partnerOneFirstName: 'Maya',
        partnerTwoFirstName: 'Jordan',
        weddingCity: 'Napa',
        selectedTemplateId: 'modern-luxe',
      },
    });

    expect(experience.title).toBe('Your site has not been created yet');
    expect(experience.detail).toContain('Modern Luxe');
    expect(experience.detail).toContain('Maya & Jordan');
    expect(experience.primaryActionLabel).toBe('Resume setup');
  });

  it('keeps loading in demo mode framed as rehearsal instead of live editing', () => {
    const experience = getBuilderEntryExperience({
      mode: 'loading',
      isDemoMode: true,
    });

    expect(experience.title).toBe('Opening the demo builder');
    expect(experience.bestNextMove).toContain('Scan one page');
  });

  it('classifies connection failures as retry-first recovery', () => {
    const experience = getBuilderEntryExperience({
      mode: 'error',
      errorMessage: 'Failed to fetch project data',
    });

    expect(experience.title).toBe('Builder connection interrupted');
    expect(experience.primaryActionLabel).toBe('Try again');
    expect(experience.decisionRule).toContain('Retry transient connection problems');
  });

  it('classifies access failures as dashboard-first recovery', () => {
    const experience = getBuilderEntryExperience({
      mode: 'error',
      errorMessage: 'JWT expired',
    });

    expect(experience.title).toBe('Builder access needs to be refreshed');
    expect(experience.primaryActionLabel).toBe('Back to dashboard');
    expect(experience.secondaryActionLabel).toBe('Try again');
  });
});
