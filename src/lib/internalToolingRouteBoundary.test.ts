import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('internal tooling route boundary', () => {
  it('gates lab and capture routes through the shared helper', () => {
    const app = read('src/App.tsx');

    expect(app).toContain("import { isInternalToolingRouteEnabled } from './lib/internalToolingRoutes';");
    expect(app).toContain('const internalToolingRoutesEnabled = isInternalToolingRouteEnabled();');
    expect(app).toContain('path="/builder-v2-lab" element={internalToolingRoutesEnabled ? <BuilderV2Lab /> : <Navigate to="/" replace />}');
    expect(app).toContain('path="/variant-preview-capture" element={internalToolingRoutesEnabled ? <VariantPreviewCapture /> : <Navigate to="/" replace />}');
    expect(app).toContain('path="/template-scroll-capture" element={internalToolingRoutesEnabled ? <TemplateScrollCapture /> : <Navigate to="/" replace />}');
  });

  it('removes public preview links when the helper disables internal tooling routes', () => {
    const templates = read('src/pages/Templates.tsx');
    const templateDetail = read('src/pages/TemplateDetail.tsx');
    const variantGallery = read('src/pages/dashboard/BuilderVariantGallery.tsx');

    expect(templates).toContain("import { isInternalToolingRouteEnabled } from '../lib/internalToolingRoutes';");
    expect(templates).toContain('const internalToolingRoutesEnabled = isInternalToolingRouteEnabled();');
    expect(templateDetail).toContain("import { isInternalToolingRouteEnabled } from '../lib/internalToolingRoutes';");
    expect(templateDetail).toContain('const internalToolingRoutesEnabled = isInternalToolingRouteEnabled();');
    expect(variantGallery).toContain("import { isInternalToolingRouteEnabled } from '../../lib/internalToolingRoutes';");
    expect(variantGallery).toContain('const internalToolingRoutesEnabled = isInternalToolingRouteEnabled();');
  });
});
