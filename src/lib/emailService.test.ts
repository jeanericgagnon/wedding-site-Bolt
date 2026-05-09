import { describe, expect, it } from 'vitest';
import { safeEmailFunctionError } from './emailService';

describe('safeEmailFunctionError', () => {
  it('hides backend-shaped email function errors', () => {
    expect(safeEmailFunctionError('database policy denied token abc123')).toBe('Email service is unavailable right now. Please try again.');
    expect(safeEmailFunctionError('send-wedding-email provider request failed')).toBe('Email service is unavailable right now. Please try again.');
  });

  it('keeps known customer-safe email validation copy', () => {
    expect(safeEmailFunctionError('Invalid email address')).toBe('Invalid email address');
    expect(safeEmailFunctionError('Wedding site is required')).toBe('Wedding site is required');
  });
});
