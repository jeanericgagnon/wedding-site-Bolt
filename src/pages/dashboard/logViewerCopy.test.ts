import { describe, expect, it } from 'vitest';

import {
  AUDIT_LOGS_LOAD_RETRY_ERROR,
  ERROR_LOGS_LOAD_RETRY_ERROR,
  mapLogViewerError,
} from './logViewerCopy';

describe('logViewerCopy', () => {
  it('masks internal audit and error-log failures behind safe owner copy', () => {
    expect(mapLogViewerError(new Error('Supabase policy denied guest_audit_logs select'), AUDIT_LOGS_LOAD_RETRY_ERROR)).toBe(
      AUDIT_LOGS_LOAD_RETRY_ERROR,
    );
    expect(mapLogViewerError(new Error('functions/v1/error-log provider timeout with token=abc'), ERROR_LOGS_LOAD_RETRY_ERROR)).toBe(
      ERROR_LOGS_LOAD_RETRY_ERROR,
    );
  });
});
