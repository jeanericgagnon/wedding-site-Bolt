import { describe, expect, it } from 'vitest';
import { buildCoordinatorQnaAnswerPatch, getCoordinatorQnaCounts, updateCoordinatorQnaItem } from './coordinatorQnaFlow';

describe('coordinatorQnaFlow', () => {
  it('marks a question answered when an answer is present', () => {
    expect(buildCoordinatorQnaAnswerPatch('Parking is behind the chapel.')).toEqual({
      answer: 'Parking is behind the chapel.',
      status: 'answered',
    });
  });

  it('reopens a question when the answer is cleared', () => {
    expect(buildCoordinatorQnaAnswerPatch('   ')).toEqual({
      answer: null,
      status: 'new',
    });
  });

  it('updates the targeted q&a item and keeps counts accurate', () => {
    const next = updateCoordinatorQnaItem([
      { id: 'q1', question: 'Where do I park?', status: 'new' },
      { id: 'q2', question: 'What time should we arrive?', status: 'answered', answer: 'Arrive at 4:30.' },
    ], 'q1', 'Use the hotel valet lot.');

    expect(next[0]).toMatchObject({ status: 'answered', answer: 'Use the hotel valet lot.' });
    expect(getCoordinatorQnaCounts(next)).toEqual({ open: 0, answered: 2 });
  });
});
