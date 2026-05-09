import { describe, expect, it, vi, beforeEach } from 'vitest';

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

import { logClientError } from './errorLogger';

describe('logClientError', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({ error: null });
    window.history.pushState({}, '', '/dashboard/overview');
  });

  it('sanitizes internal client error messages and stacks before telemetry upload', async () => {
    logClientError({
      source: `section-boundary-${Date.now()}`,
      severity: 'error',
      message: 'Supabase storage bucket token policy failed for provider request',
      stack: 'Error: Supabase storage bucket token policy failed\n at dashboard.tsx:10',
      metadata: { sectionId: 'hero' },
    });

    await Promise.resolve();

    expect(invokeMock).toHaveBeenCalledWith('log-client-error', {
      body: expect.objectContaining({
        route: '/dashboard/overview',
        message: 'Client error captured.',
        stack: undefined,
        metadata: { sectionId: 'hero' },
      }),
    });
  });

  it('redacts sensitive metadata before uploading telemetry', async () => {
    logClientError({
      source: `metadata-redaction-${Date.now()}`,
      severity: 'error',
      message: 'Client failed',
      metadata: {
        search: '?token=invite-secret&secureToken=private-access&view=dashboard',
        authorization: 'Bearer secret-token',
        nested: {
          access_token: 'session-token',
          note: 'retry with api_key=abc123 session=browser-session passcode=1234 soon',
        },
        list: ['safe', 'password=hunter2', 'cookie=dayof_session auth=temporary jwt=header.payload.sig'],
      },
    });

    await Promise.resolve();

    expect(invokeMock).toHaveBeenCalledWith('log-client-error', {
      body: expect.objectContaining({
        metadata: {
          search: '?token=[redacted]&secureToken=[redacted]&view=dashboard',
          authorization: '[redacted]',
          nested: {
            access_token: '[redacted]',
            note: 'retry with api_key=[redacted] session=[redacted] passcode=[redacted] soon',
          },
          list: ['safe', 'password=[redacted]', 'cookie=[redacted] auth=[redacted] jwt=[redacted]'],
        },
      }),
    });
  });

  it('keeps dashboard-only logging and ignores public routes', async () => {
    window.history.pushState({}, '', '/site/alex-jordan');

    logClientError({
      source: `public-route-${Date.now()}`,
      message: 'Something failed',
    });

    await Promise.resolve();

    expect(invokeMock).not.toHaveBeenCalled();
  });
});
