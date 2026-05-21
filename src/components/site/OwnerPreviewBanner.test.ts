import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('OwnerPreviewBanner', () => {
  it('keeps owner preview chrome hidden for unauthenticated public visitors', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/site/OwnerPreviewBanner.tsx'),
      'utf8',
    );

    expect(source).toContain("import { useAuth } from '../../hooks/useAuth';");
    expect(source).toContain('if (!user && !isDemoMode) return null;');
  });
});
