import { describe, expect, it } from 'vitest';

import {
  COORDINATOR_ALERT_RETRY_ERROR,
  COORDINATOR_CHECKIN_RETRY_ERROR,
  COORDINATOR_QNA_ANSWER_RETRY_ERROR,
  mapCoordinatorError,
} from './coordinatorErrorCopy';

describe('coordinatorErrorCopy', () => {
  it('masks provider and internal coordinator failures behind calm owner copy', () => {
    expect(mapCoordinatorError(new Error('functions/v1/coordinator-alert provider timeout with token=abc'), COORDINATOR_ALERT_RETRY_ERROR)).toBe(
      COORDINATOR_ALERT_RETRY_ERROR,
    );
    expect(mapCoordinatorError(new Error('Supabase policy denied guest_qna_items update'), COORDINATOR_QNA_ANSWER_RETRY_ERROR)).toBe(
      COORDINATOR_QNA_ANSWER_RETRY_ERROR,
    );
    expect(mapCoordinatorError(new Error('invalid jwt in check-in update'), COORDINATOR_CHECKIN_RETRY_ERROR)).toBe(
      COORDINATOR_CHECKIN_RETRY_ERROR,
    );
  });
});
