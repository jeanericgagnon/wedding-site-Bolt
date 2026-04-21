import { describe, expect, it } from 'vitest';
import { filterCoordinatorQnaItems, getCoordinatorQnaDraftStateLabel } from './coordinatorQnaTriage';

const items = [
  { id: '1', question: 'Where do we park?', status: 'new' as const, answer: null },
  { id: '2', question: 'What time is dinner?', status: 'answered' as const, answer: 'Dinner starts at 6 PM.' },
  { id: '3', question: 'Can I bring my child?', status: 'new' as const, answer: null },
];

describe('coordinatorQnaTriage', () => {
  it('filters Q&A items by triage lane', () => {
    expect(filterCoordinatorQnaItems(items, 'open').map((item) => item.id)).toEqual(['1', '3']);
    expect(filterCoordinatorQnaItems(items, 'answered').map((item) => item.id)).toEqual(['2']);
    expect(filterCoordinatorQnaItems(items, 'all').map((item) => item.id)).toEqual(['1', '2', '3']);
  });

  it('describes whether the focused answer draft is saved or still in progress', () => {
    expect(getCoordinatorQnaDraftStateLabel({ draftAnswer: '', savedAnswer: null })).toBe('No draft yet');
    expect(getCoordinatorQnaDraftStateLabel({ draftAnswer: 'Dinner starts at 6 PM.', savedAnswer: 'Dinner starts at 6 PM.' })).toBe('Answer saved');
    expect(getCoordinatorQnaDraftStateLabel({ draftAnswer: 'Dinner starts at 6:30 PM.', savedAnswer: 'Dinner starts at 6 PM.' })).toBe('Unsaved reply');
    expect(getCoordinatorQnaDraftStateLabel({ draftAnswer: '', savedAnswer: 'Dinner starts at 6 PM.' })).toBe('Draft cleared');
  });
});
