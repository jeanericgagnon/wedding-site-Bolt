import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MAX_ACTIVE_SITE_COLLABORATOR_LOOKUP_ROWS,
  MAX_ACTIVE_SITE_OWNED_LOOKUP_ROWS,
} from './activeSite';

describe('activeSite query bounds', () => {
  it('exports stable active-site singleton lookup caps', () => {
    expect(MAX_ACTIVE_SITE_OWNED_LOOKUP_ROWS).toBe(1);
    expect(MAX_ACTIVE_SITE_COLLABORATOR_LOOKUP_ROWS).toBe(1);
  });

  it('keeps fallback owned and collaborator site lookups bounded', () => {
    const source = readFileSync(join(process.cwd(), 'src/lib/activeSite.ts'), 'utf8');

    expect(source).toContain('MAX_ACTIVE_SITE_OWNED_LOOKUP_ROWS = 1');
    expect(source).toContain('MAX_ACTIVE_SITE_COLLABORATOR_LOOKUP_ROWS = 1');
    expect(source).toContain(".order('created_at', { ascending: true })\n    .limit(MAX_ACTIVE_SITE_OWNED_LOOKUP_ROWS)");
    expect(source).toContain(".order('created_at', { ascending: true })\n    .limit(MAX_ACTIVE_SITE_COLLABORATOR_LOOKUP_ROWS)");
  });
});
