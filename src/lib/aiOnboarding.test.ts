import { describe, expect, it } from 'vitest';
import { applyOnboardingInput, createOnboardingSessionState, extractWeddingProfileUpdates } from './aiOnboarding';
import { createEmptyWeddingProfile } from './weddingProfile';

describe('aiOnboarding', () => {
  it('extracts couple names from ampersand input', () => {
    const result = extractWeddingProfileUpdates('Alex & Jordan', createEmptyWeddingProfile());
    expect(result.updates.couple?.displayNames).toBe('Alex & Jordan');
    expect(result.updates.couple?.partnerOne).toBe('Alex');
  });

  it('creates critical-field collection session when profile is sparse', () => {
    const session = createOnboardingSessionState(createEmptyWeddingProfile());
    expect(session.currentIntent).toBe('collect-critical-field');
    expect(session.nextQuestionKey).toBeTruthy();
  });

  it('moves toward draft readiness after critical inputs are applied', () => {
    let session = createOnboardingSessionState(createEmptyWeddingProfile());
    session = applyOnboardingInput(session, 'Alex & Jordan');
    session = applyOnboardingInput(session, '2027-06-12');
    session = applyOnboardingInput(session, 'San Diego, CA');
    expect(session.readiness.hasEnoughToDraft).toBe(true);
  });
});
