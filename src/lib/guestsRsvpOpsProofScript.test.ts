import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('guests rsvp ops proof script', () => {
  it('uses a portable shell instead of hard-coding macOS zsh', () => {
    const source = readFileSync(join(process.cwd(), 'scripts/v1-proof-guests-rsvp-ops.mjs'), 'utf8');

    expect(source).toContain("process.env.SHELL || '/bin/bash'");
    expect(source).toContain("process.env.ComSpec || 'cmd.exe'");
    expect(source).not.toContain("shell: '/bin/zsh'");
  });
});
