import { describe, expect, it } from 'vitest';

import { EMAIL_SERVICE_RETRY_ERROR, mapEmailServiceError } from './emailServiceCopy';

describe('emailServiceCopy', () => {
  it('keeps provider and function failures behind calm email retry copy', () => {
    expect(
      mapEmailServiceError('provider timeout token=abc while calling send-wedding-email'),
    ).toBe(EMAIL_SERVICE_RETRY_ERROR);
    expect(
      mapEmailServiceError(new Error('functions/v1/send-wedding-email failed with relation "email_log" missing')),
    ).toBe(EMAIL_SERVICE_RETRY_ERROR);
  });
});
