import { describe, expect, it } from 'vitest';
import { getFirstOpenCoordinatorQnaId, getNextCoordinatorQnaFocusId } from './coordinatorQnaFocus';

describe('coordinatorQnaFocus', () => {
  const items = [
    { id: 'q1', question: 'Where do I park?', status: 'new' as const },
    { id: 'q2', question: 'Can I bring a plus one?', status: 'answered' as const, answer: 'No' },
    { id: 'q3', question: 'What time should I arrive?', status: 'new' as const },
  ];

  it('finds the first unresolved guest question', () => {
    expect(getFirstOpenCoordinatorQnaId(items)).toBe('q1');
  });

  it('advances focus to the next unresolved question after the current one', () => {
    expect(getNextCoordinatorQnaFocusId(items, 'q1')).toBe('q3');
    expect(getNextCoordinatorQnaFocusId(items, 'q3')).toBe('q1');
  });
});
