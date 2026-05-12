import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('internal tooling route boundary', () => {
  it('gates lab and capture routes through the shared admin-aware helper', () => {
    const app = read('src/App.tsx');

    expect(app).toContain("import { useInternalToolingRouteAccess } from './lib/internalToolingRoutes';");
    expect(app).toContain('const {');
    expect(app).toContain('internalToolingRoutesEnabled,');
    expect(app).toContain('internalToolingRoutesLoading,');
    expect(app).toContain('} = useInternalToolingRouteAccess();');
    expect(app).toContain('const internalToolingFallback = internalToolingRoutesLoading');
    expect(app).toContain('path="/builder-v2-lab" element={internalToolingRoutesEnabled ? <BuilderV2Lab /> : internalToolingFallback}');
    expect(app).toContain('path="/variant-preview-capture" element={internalToolingRoutesEnabled ? <VariantPreviewCapture /> : internalToolingFallback}');
    expect(app).toContain('path="/template-scroll-capture" element={internalToolingRoutesEnabled ? <TemplateScrollCapture /> : internalToolingFallback}');
  });

  it('removes public preview links when the helper disables internal tooling routes', () => {
    const templates = read('src/pages/Templates.tsx');
    const templateDetail = read('src/pages/TemplateDetail.tsx');
    const variantGallery = read('src/pages/dashboard/BuilderVariantGallery.tsx');

    expect(templates).toContain("import { useInternalToolingRouteAccess } from '../lib/internalToolingRoutes';");
    expect(templates).toContain('const { internalToolingRoutesEnabled } = useInternalToolingRouteAccess();');
    expect(templateDetail).toContain("import { useInternalToolingRouteAccess } from '../lib/internalToolingRoutes';");
    expect(templateDetail).toContain('const { internalToolingRoutesEnabled } = useInternalToolingRouteAccess();');
    expect(variantGallery).toContain("import { useInternalToolingRouteAccess } from '../../lib/internalToolingRoutes';");
    expect(variantGallery).toContain('const { internalToolingRoutesEnabled } = useInternalToolingRouteAccess();');
  });
});
