import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('live guest proof context helpers', () => {
  it('does not wait indefinitely for the dashboard preview link to appear before falling back', () => {
    const hubSource = readFileSync(join(process.cwd(), 'tests/e2e/liveGuestHubProofContext.ts'), 'utf8');
    const previewSource = readFileSync(join(process.cwd(), 'tests/e2e/liveGuestPreviewProofContext.ts'), 'utf8');

    expect(hubSource).toContain("getAttribute('href', { timeout: 1_500 })");
    expect(hubSource).toContain('textContent({ timeout: 1_500 })');
    expect(previewSource).toContain("getAttribute('href', { timeout: 1_500 })");
    expect(previewSource).toContain('textContent({ timeout: 1_500 })');
  });
});
