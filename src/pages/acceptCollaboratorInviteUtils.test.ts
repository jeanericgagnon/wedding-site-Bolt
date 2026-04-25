import { describe, expect, it, vi } from 'vitest';
import { getCollaboratorRedirectPath, isInviteEmailMatch, resolveInviteValidationState } from './acceptCollaboratorInviteUtils';

describe('acceptCollaboratorInviteUtils', () => {
  it('matches invite emails case-insensitively', () => {
    expect(isInviteEmailMatch('Planner@Example.com ', ' planner@example.com')).toBe(true);
    expect(isInviteEmailMatch('other@example.com', 'planner@example.com')).toBe(false);
  });

  it('resolves invite validation states from status and expiry', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-13T22:00:00.000Z'));

    expect(resolveInviteValidationState(null)).toBe('invalid');
    expect(resolveInviteValidationState({ status: 'revoked' })).toBe('revoked');
    expect(resolveInviteValidationState({ status: 'accepted' })).toBe('accepted');
    expect(resolveInviteValidationState({ status: 'pending', expires_at: '2026-04-12T22:00:00.000Z' })).toBe('expired');
    expect(resolveInviteValidationState({ status: 'pending', expires_at: 'not-a-date' })).toBe('expired');
    expect(resolveInviteValidationState({ status: 'pending', expires_at: '2026-04-14T22:00:00.000Z' })).toBe('valid');
    expect(resolveInviteValidationState({ status: 'mystery' })).toBe('invalid');

    vi.useRealTimers();
  });

  it('uses the dashboard overview as the collaborator landing page', () => {
    expect(getCollaboratorRedirectPath()).toBe('/dashboard/overview');
  });
});
