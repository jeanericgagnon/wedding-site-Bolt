import { describe, expect, it } from 'vitest';
import { applyOnboardingInput, createOnboardingSessionState, extractWeddingProfileUpdates } from './aiOnboarding';
import { createEmptyWeddingProfile } from './weddingProfile';

describe('aiOnboarding', () => {
  it('extracts couple names from ampersand input', async () => {
    const result = await extractWeddingProfileUpdates('Alex & Jordan', createEmptyWeddingProfile());
    expect(result.updates.couple?.displayNames).toBe('Alex & Jordan');
    expect(result.updates.couple?.partnerOne).toBe('Alex');
  });

  it('creates critical-field collection session when profile is sparse', () => {
    const session = createOnboardingSessionState(createEmptyWeddingProfile());
    expect(session.currentIntent).toBe('collect-critical-field');
    expect(session.nextQuestionKey).toBeTruthy();
  });

  it('moves toward draft readiness after critical inputs are applied', async () => {
    let session = createOnboardingSessionState(createEmptyWeddingProfile());
    session = await applyOnboardingInput(session, 'Alex & Jordan');
    session = await applyOnboardingInput(session, '2027-06-12');
    session = await applyOnboardingInput(session, 'San Diego, CA');
    expect(session.readiness.hasEnoughToDraft).toBe(true);
  });

  it('ignores impossible wedding dates instead of treating them as captured profile truth', async () => {
    const result = await extractWeddingProfileUpdates('2027-02-30', createEmptyWeddingProfile());

    expect(result.updates.event?.date).toBeUndefined();
    expect(result.notes).not.toContain('Captured wedding date');
  });
});


it('suggests the next critical prompt for sparse profiles', () => {
  const session = createOnboardingSessionState(createEmptyWeddingProfile());
  expect(session.suggestedPrompt).toBeTruthy();
  expect(session.nextQuestionKey).toBe('partnerNames');
});

it('surfaces conflict intent when a conflicting wedding date is provided', async () => {
  const seeded = createOnboardingSessionState({
    ...createEmptyWeddingProfile(),
    couple: { ...createEmptyWeddingProfile().couple, displayNames: 'Alex & Jordan', partnerOne: 'Alex', partnerTwo: 'Jordan' },
    event: { ...createEmptyWeddingProfile().event, date: '2027-06-12', venueLocation: 'San Diego, CA' },
    meta: { readinessScore: 60 },
  });
  const next = await applyOnboardingInput(seeded, '2027-07-01');
  expect(next.currentIntent).toBe('confirm-conflict');
  expect(next.unresolvedConflicts.length).toBeGreaterThan(0);
});


it('assigns high confidence to explicit registry links', async () => {
  const result = await extractWeddingProfileUpdates('https://zola.com/our-registry', createEmptyWeddingProfile());
  expect(result.confidence).toBeGreaterThan(0.9);
  expect(result.requiresConfirmation).toBe(false);
});

it('requires confirmation for conflicting dates', async () => {
  const seeded = createOnboardingSessionState({
    ...createEmptyWeddingProfile(),
    event: { ...createEmptyWeddingProfile().event, date: '2027-06-12', venueLocation: 'San Diego, CA' },
    couple: { ...createEmptyWeddingProfile().couple, displayNames: 'Alex & Jordan', partnerOne: 'Alex', partnerTwo: 'Jordan' },
    meta: { readinessScore: 60 },
  });
  const next = await applyOnboardingInput(seeded, '2027-07-01');
  expect(next.currentIntent).toBe('confirm-conflict');
  expect(next.confidence).toBeLessThan(0.5);
});


it('captures guest experience from tone-oriented input', async () => {
  let session = createOnboardingSessionState(createEmptyWeddingProfile());
  session = await applyOnboardingInput(session, 'Relaxed, welcomed, and genuinely taken care of');
  expect(session.profile.guestExperience.summary).toBe('Relaxed, welcomed, and genuinely taken care of');
});

it('captures weekend events from itinerary-like input', async () => {
  let session = createOnboardingSessionState(createEmptyWeddingProfile());
  session = await applyOnboardingInput(session, 'Friday welcome dinner, Saturday wedding, Sunday brunch');
  expect(session.profile.event.weekendEvents).toBe('Friday welcome dinner, Saturday wedding, Sunday brunch');
});

it('captures venue names from venue-like phrases', async () => {
  const next = await applyOnboardingInput(createOnboardingSessionState(createEmptyWeddingProfile()), 'Grand Estate');
  expect(next.profile.event.venueName).toBe('Grand Estate');
});

it('personalizes the next suggested prompt from known profile context', async () => {
  const seeded = createOnboardingSessionState({
    ...createEmptyWeddingProfile(),
    couple: { ...createEmptyWeddingProfile().couple, displayNames: 'Alex & Jordan', partnerOne: 'Alex', partnerTwo: 'Jordan' },
    event: { ...createEmptyWeddingProfile().event, venueLocation: 'San Diego, CA' },
  });
  const next = await applyOnboardingInput(seeded, '2027-06-12');
  expect(next.nextQuestionKey).toBe('venueName');
  expect(next.suggestedPrompt).toContain('San Diego, CA');
});
