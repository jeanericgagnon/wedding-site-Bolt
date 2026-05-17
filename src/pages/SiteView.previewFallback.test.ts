import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('site view preview fallback', () => {
  it('keeps the owner preview banner visible even when the public site is not guest-ready yet', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/SiteView.tsx'), 'utf8');

    expect(source).toContain('const fallback = (');
    expect(source).toContain('<OwnerPreviewBanner />');
    expect(source).toContain('This wedding site is not ready to view yet.');
  });
});
