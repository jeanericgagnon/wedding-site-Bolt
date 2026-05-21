import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('TemplateDetail page metadata', () => {
  it('shows dedicated page titles and guest URLs on the detail surface', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/TemplateDetail.tsx'), 'utf8');

    expect(source).toContain('tpl.pageTitles.map');
    expect(source).toContain('tpl.guestRoutes.map');
    expect(source).toContain('tpl.pageBlueprints.map');
    expect(source).toContain('Page blueprint');
    expect(source).toContain('Guest readiness');
    expect(source).toContain('tpl.readinessLabel');
    expect(source).toContain('This starts as a multi-page site.');
  });
});
