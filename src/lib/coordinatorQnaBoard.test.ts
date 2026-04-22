import { describe, expect, it } from 'vitest';
import { buildCoordinatorQnaBoard } from './coordinatorQnaBoard';

describe('coordinatorQnaBoard', () => {
  const items = [
    { id: 'q1', question: 'Where is parking?', status: 'new' as const, answer: null },
    { id: 'q2', question: 'What time is dinner?', status: 'answered' as const, answer: '6 PM' },
    { id: 'q3', question: 'Can I bring my kids?', status: 'new' as const, answer: null },
  ];

  it('flags when the focused question still needs a send-ready reply', () => {
    expect(buildCoordinatorQnaBoard({
      items,
      activeItem: items[0],
      activeDraftStateLabel: 'Unsaved reply',
    })).toEqual({
      statusLabel: 'Focused reply needs send-ready copy',
      tone: 'warning',
      activeLabel: 'Where is parking?',
      nextLabel: 'Can I bring my kids?',
      backlogLabel: '2 open · 1 answered',
      draftLabel: 'Unsaved reply',
    });
  });

  it('shows a clear board when there is no focused question and no open backlog', () => {
    expect(buildCoordinatorQnaBoard({
      items: [{ id: 'q2', question: 'What time is dinner?', status: 'answered', answer: '6 PM' }],
      activeItem: null,
      activeDraftStateLabel: 'No focused draft',
    })).toEqual({
      statusLabel: 'Guest Q&A is clear',
      tone: 'neutral',
      activeLabel: 'No focused guest question',
      nextLabel: 'No other open questions queued',
      backlogLabel: '0 open · 1 answered',
      draftLabel: 'No focused draft',
    });
  });
});
