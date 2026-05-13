import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('qr scanner proof script', () => {
  it('runs qr parsing, scanner tests, and build integrity together', () => {
    const source = readFileSync(join(process.cwd(), 'scripts/v1-proof-qr-scanner.mjs'), 'utf8');

    expect(source).toContain('src/lib/qr/qrPayload.test.ts');
    expect(source).toContain('src/components/qr/QrScanner.test.tsx');
    expect(source).toContain('npm run build');
  });
});
