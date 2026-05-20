import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('proof preview runtime script', () => {
  it('fails fast when the preview process exits before readiness', () => {
    const source = readFileSync(join(process.cwd(), 'scripts/proofPreviewRuntime.mjs'), 'utf8');

    expect(source).toContain('getStartupFailureMessage');
    expect(source).toContain('previewProcess.exitCode === null && previewProcess.signalCode === null');
    expect(source).toContain('Preview server exited before becoming ready at');
    expect(source).toContain('previewOutput.stderr.trim()');
  });
});
