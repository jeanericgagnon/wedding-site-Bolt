import { describe, expect, it } from 'vitest';
import { resolveCoordinatorQueueFocus } from './coordinatorQueueFocus';

describe('coordinatorQueueFocus', () => {
  it('routes door-review escalations into the arrivals queue with review-only mode', () => {
    expect(resolveCoordinatorQueueFocus('door-review')).toEqual({
      filter: 'arrivals',
      reviewOnly: true,
    });
  });

  it('falls back to the default live arrivals view for other cases', () => {
    expect(resolveCoordinatorQueueFocus('open-qna')).toEqual({
      filter: 'arrivals',
      reviewOnly: false,
    });
  });
});
