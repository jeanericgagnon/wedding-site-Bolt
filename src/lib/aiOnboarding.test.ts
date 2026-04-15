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


it('suggests the next critical prompt for sparse profiles', () => {
  const session = createOnboardingSessionState(createEmptyWeddingProfile());
  expect(session.suggestedPrompt).toBeTruthy();
  expect(session.nextQuestionKey).toBe('partnerNames');
});

it('surfaces conflict intent when a conflicting wedding date is provided', () => {
  const seeded = createOnboardingSessionState({
    ...createEmptyWeddingProfile(),
    couple: { ...createEmptyWeddingProfile().couple, displayNames: 'Alex & Jordan', partnerOne: 'Alex', partnerTwo: 'Jordan' },
    event: { ...createEmptyWeddingProfile().event, date: '2027-06-12', venueLocation: 'San Diego, CA' },
    meta: { readinessScore: 60 },
  });
  const next = applyOnboardingInput(seeded, '2027-07-01');
  expect(next.currentIntent).toBe('confirm-conflict');
  expect(next.unresolvedConflicts.length).toBeGreaterThan(0);
});


it('assigns high confidence to explicit registry links', () => {
  const result = extractWeddingProfileUpdates('https://zola.com/our-registry', createEmptyWeddingProfile());
  expect(result.confidence).toBeGreaterThan(0.9);
  expect(result.requiresConfirmation).toBe(false);
});

it('requires confirmation for conflicting dates', () => {
  const seeded = createOnboardingSessionState({
    ...createEmptyWeddingProfile(),
    event: { ...createEmptyWeddingProfile().event, date: '2027-06-12', venueLocation: 'San Diego, CA' },
    couple: { ...createEmptyWeddingProfile().couple, displayNames: 'Alex & Jordan', partnerOne: 'Alex', partnerTwo: 'Jordan' },
    meta: { readinessScore: 60 },
  });
  const next = applyOnboardingInput(seeded, '2027-07-01');
  expect(next.currentIntent).toBe('confirm-conflict');
  expect(next.confidence).toBeLessThan(0.5);
});


it('captures ceremony and reception times progressively', () => {
  let session = createOnboardingSessionState(createEmptyWeddingProfile());
  session = applyOnboardingInput(session, '4:00');
  expect(session.profile.event.ceremonyTime).toBe('4:00');
  session = applyOnboardingInput(session, '7:30');
  expect(session.profile.event.receptionTime).toBe('7:30');
});

it('captures venue names from venue-like phrases', () => {
  const next = applyOnboardingInput(createOnboardingSessionState(createEmptyWeddingProfile()), 'Grand Estate');
  expect(next.profile.event.venueName).toBe('Grand Estate');
});
