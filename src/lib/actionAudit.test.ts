import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { MAX_APP_ACTION_AUDIT_ROWS, sanitizeMetadata } from './actionAudit';

describe('sanitizeMetadata', () => {
  it('removes sensitive keys recursively before audit metadata is stored', () => {
    const sanitized = sanitizeMetadata({
      action: 'invite_created',
      accessToken: 'browser-token',
      nested: {
        keep: 'planner',
        service_role_key: 'service-role-value',
        deeper: {
          authorization: 'Bearer secret',
          count: 2,
        },
      },
      rows: [
        { email: 'guest@example.com', refresh_token: 'refresh-token' },
        { label: 'safe' },
      ],
    });

    expect(sanitized).toEqual({
      action: 'invite_created',
      nested: {
        keep: 'planner',
        deeper: {
          count: 2,
        },
      },
      rows: [
        { email: 'guest@example.com' },
        { label: 'safe' },
      ],
    });
    expect(JSON.stringify(sanitized)).not.toMatch(/token|service-role-value|Bearer secret/i);
  });

  it('bounds oversized metadata strings, arrays, and deep objects', () => {
    const sanitized = sanitizeMetadata({
      long: 'x'.repeat(520),
      rows: Array.from({ length: 30 }, (_, index) => ({ index })),
      deep: { a: { b: { c: { d: { e: 'too deep' } } } } },
    });

    expect(String(sanitized.long)).toHaveLength(500);
    expect(String(sanitized.long)).toMatch(/\.\.\.$/);
    expect(sanitized.rows).toHaveLength(25);
    expect(sanitized.deep).toEqual({ a: { b: { c: '[truncated]' } } });
  });

  it('handles circular metadata without throwing', () => {
    const circular: Record<string, unknown> = { label: 'safe' };
    circular.self = circular;

    expect(sanitizeMetadata(circular)).toEqual({
      label: 'safe',
      self: '[circular]',
    });
  });

  it('exports a stable action-audit row cap and applies it to list reads', () => {
    expect(MAX_APP_ACTION_AUDIT_ROWS).toBe(100);

    const source = readFileSync(join(process.cwd(), 'src/lib/actionAudit.ts'), 'utf8');
    expect(source).toContain('const boundedLimit = Math.max(1, Math.min(MAX_APP_ACTION_AUDIT_ROWS, Math.floor(limit || 0) || 50));');
    expect(source).toContain('.limit(boundedLimit);');
    expect(source).toContain("supabase.rpc('app_action_audit_log_write'");
    expect(source).not.toContain(".from('app_action_audit_logs').insert");
  });
});
