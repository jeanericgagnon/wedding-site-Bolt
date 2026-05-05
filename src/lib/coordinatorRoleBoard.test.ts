import { describe, expect, it } from 'vitest';
import { buildCoordinatorRoleBoard } from './coordinatorRoleBoard';

describe('coordinatorRoleBoard', () => {
  it('summarizes coordinator guardrails without losing live authority', () => {
    expect(buildCoordinatorRoleBoard({
      role: 'coordinator',
      capabilities: [
        { key: 'check-in', label: 'Check-in', enabled: true, detail: '' },
        { key: 'timeline', label: 'Timeline', enabled: true, detail: '' },
        { key: 'qna', label: 'Guest Q&A', enabled: true, detail: '' },
        { key: 'alerts-now', label: 'Send now', enabled: true, detail: '' },
        { key: 'alerts-later', label: 'Schedule', enabled: false, detail: '' },
      ],
    })).toEqual({
      statusLabel: 'This role can help on the wedding day with guardrails',
      tone: 'warning',
      modeLabel: 'Coordinator helper',
      enabledLabel: 'Check-in · Timeline · Guest Q&A · Send now',
      blockedLabel: 'Schedule',
      guidanceLabel: 'Run guest movement, live timing, answers, and urgent sends without drifting into planner-only work.',
    });
  });

  it('shows viewer posture as observation-only', () => {
    expect(buildCoordinatorRoleBoard({
      role: 'viewer',
      capabilities: [
        { key: 'check-in', label: 'Check-in', enabled: false, detail: '' },
        { key: 'timeline', label: 'Timeline', enabled: false, detail: '' },
      ],
    })).toEqual({
      statusLabel: 'This role is watching the room',
      tone: 'neutral',
      modeLabel: 'Read-only observer',
      enabledLabel: 'No live actions enabled',
      blockedLabel: 'Check-in · Timeline',
      guidanceLabel: 'Use this view to track handoffs and escalate decisions without changing the board.',
    });
  });
});
