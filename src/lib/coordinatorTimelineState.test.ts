import { describe, expect, it } from 'vitest';
import { setCoordinatorEventTimelineState } from './coordinatorTimelineState';

describe('coordinatorTimelineState', () => {
  it('keeps only one event marked live at a time', () => {
    expect(
      setCoordinatorEventTimelineState(
        { ceremony: 'live', cocktails: 'up-next', dinner: 'done' },
        'cocktails',
        'live',
      ),
    ).toEqual({
      ceremony: 'up-next',
      cocktails: 'live',
      dinner: 'done',
    });
  });

  it('updates non-live transitions without disturbing other states', () => {
    expect(
      setCoordinatorEventTimelineState(
        { ceremony: 'live', cocktails: 'up-next' },
        'cocktails',
        'done',
      ),
    ).toEqual({
      ceremony: 'live',
      cocktails: 'done',
    });
  });
});
