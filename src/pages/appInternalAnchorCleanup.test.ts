import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('app internal anchor cleanup', () => {
  it('uses router links for the remaining internal app anchors', () => {
    const siteViewSource = read('src/pages/SiteView.tsx');
    const vendorsSource = read('src/pages/dashboard/planning/VendorsTab.tsx');

    expect(siteViewSource).toContain("import { Link, useParams, useSearchParams } from 'react-router-dom';");
    expect(siteViewSource).toContain('<Link to="/login" className="text-primary hover:underline">Sign in</Link>');
    expect(siteViewSource).not.toContain('<a href="/login"');

    expect(vendorsSource).toContain("import { Link } from 'react-router-dom';");
    expect(vendorsSource).toContain('<Link to="/vendor-templates"');
    expect(vendorsSource).not.toContain('<a href="/vendor-templates"');
  });
});
