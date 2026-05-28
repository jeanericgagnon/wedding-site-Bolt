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
    expect(experience.detail).toContain('real couple data');
    expect(experience.bestNextMove).toContain('Scan one page');
  });

  it('keeps no-site setup handoff framed around a missing site record', () => {
    const experience = getBuilderEntryExperience({
      mode: 'no-site',
      draft: {
        ...emptySetupDraft,
        partnerOneFirstName: 'Maya',
        partnerTwoFirstName: 'Jordan',
        selectedTemplateId: 'modern-luxe',
      },
    });

    expect(experience.currentStep).toBe('You have a partial setup draft but no site record yet.');
  });

  it('classifies connection failures as retry-first recovery', () => {
    const experience = getBuilderEntryExperience({
      mode: 'error',
      errorMessage: 'Failed to fetch project data',
    });

    expect(experience.title).toBe('Builder connection interrupted');
    expect(experience.detail).toBe('The Builder could not reconnect cleanly right now. Please try again.');
    expect(experience.primaryActionLabel).toBe('Try again');
    expect(experience.decisionRule).toContain('Retry transient connection problems');
  });

  it('classifies access failures as dashboard-first recovery', () => {
    const experience = getBuilderEntryExperience({
      mode: 'error',
      errorMessage: 'JWT expired',
    });

    expect(experience.title).toBe('Builder access needs to be refreshed');
    expect(experience.detail).toBe('The Builder needs a fresh account check before it can reopen your draft.');
    expect(experience.primaryActionLabel).toBe('Back to dashboard overview');
    expect(experience.secondaryActionLabel).toBe('Try again');
  });

  it('keeps generic recovery labels anchored to the overview workspace wording', () => {
    const experience = getBuilderEntryExperience({
      mode: 'error',
      errorMessage: 'Something unexpected happened',
    });

    expect(experience.secondaryActionLabel).toBe('Back to dashboard overview');
    expect(experience.secondaryActionLabel).not.toBe('Back to dashboard');
    expect(experience.detail).toBe('Unable to load your project right now.');
  });

  it('does not surface raw provider details in the builder recovery copy', () => {
    const experience = getBuilderEntryExperience({
      mode: 'error',
      errorMessage: 'Supabase relation wedding_sites does not exist',
    });

    expect(experience.detail).toBe('Unable to load your project right now.');
    expect(experience.detail).not.toContain('Supabase');
  });
});
