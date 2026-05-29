import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('openai client safety', () => {
  it('does not rely on browser-exposed Vite AI key vars', () => {
    const source = readFileSync(join(process.cwd(), 'src/lib/openai.ts'), 'utf8');

    expect(source).toContain("getEnvValue('OPENAI_API_KEY')");
    expect(source).toContain("getEnvValue('OPENAI_MODEL')");
    expect(source).not.toContain('VITE_OPENAI_API_KEY');
    expect(source).not.toContain('VITE_OPENAI_MODEL');
  });

  it('keeps the missing-config message free of setup-token instructions', () => {
    const source = readFileSync(join(process.cwd(), 'src/lib/openai.ts'), 'utf8');

    expect(source).toContain('Model-backed AI is not configured for this environment.');
    expect(source).not.toContain('Set VITE_OPENAI_API_KEY');
  });
});
