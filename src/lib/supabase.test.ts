import { describe, expect, it } from 'vitest';
import { safeFunctionFailureTelemetryMessage } from './supabase';

describe('safeFunctionFailureTelemetryMessage', () => {
  it('hides raw provider and backend response text from browser telemetry', () => {
    expect(safeFunctionFailureTelemetryMessage('Supabase policy denied token abc123', 500)).toBe('Request failed with status 500.');
    expect(safeFunctionFailureTelemetryMessage('OpenAI provider database relation failed', 503)).toBe('Request failed with status 503.');
  });

  it('preserves short public-safe authorization denial copy', () => {
    expect(safeFunctionFailureTelemetryMessage('Unauthorized', 401)).toBe('Unauthorized');
    expect(safeFunctionFailureTelemetryMessage('Unauthorized.', 401)).toBe('Unauthorized.');
    expect(safeFunctionFailureTelemetryMessage('Forbidden', 403)).toBe('Forbidden');
  });
});
