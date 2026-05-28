import { describe, expect, it } from 'vitest';
import { HEADER_DEMO_RETRY_ERROR, mapHeaderDemoError } from './headerErrorCopy';

describe('headerErrorCopy', () => {
  it('masks provider and token flavored demo-login failures', () => {
    expect(mapHeaderDemoError(new Error('Supabase provider timeout with access token expired'))).toBe(
      HEADER_DEMO_RETRY_ERROR,
    );
  });

  it('falls back cleanly when the error is empty', () => {
    expect(mapHeaderDemoError('')).toBe(HEADER_DEMO_RETRY_ERROR);
  });
});
