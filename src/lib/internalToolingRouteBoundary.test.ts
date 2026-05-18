import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('internal tooling route boundary', () => {
  it('gates lab routes separately from static preview capture routes through the shared helper and dedicated route module', () => {
    const app = read('src/App.tsx');
    const internalRoutes = read('src/routes/internalToolingRoutes.tsx');

    expect(app).toContain("import { InternalToolingRoutes } from './routes/internalToolingRoutes';");
    expect(app).toContain('const {');
    expect(app).toContain('internalToolingRoutesEnabled,');
    expect(app).toContain('internalToolingCaptureRoutesEnabled,');
    expect(app).toContain('internalToolingRoutesLoading,');
    expect(app).toContain('} = useInternalToolingRouteAccess();');
    expect(app).toContain('<InternalToolingRoutes');
    expect(internalRoutes).toContain('function internalToolingFallback');
    expect(internalRoutes).toContain('path="/builder-v2-lab" element={internalToolingRoutesEnabled ? <BuilderV2Lab /> : fallback}');
    expect(internalRoutes).toContain('path="/variant-preview-capture" element={internalToolingCaptureRoutesEnabled ? <VariantPreviewCapture /> : fallback}');
    expect(internalRoutes).toContain('path="/template-scroll-capture" element={internalToolingCaptureRoutesEnabled ? <TemplateScrollCapture /> : fallback}');
  });

  it('uses the capture-route helper for static preview links', () => {
    const templates = read('src/pages/Templates.tsx');
    const templateDetail = read('src/pages/TemplateDetail.tsx');
    const variantGallery = read('src/pages/dashboard/BuilderVariantGallery.tsx');

    expect(templates).toContain("import { useInternalToolingRouteAccess } from '../lib/internalToolingRoutes';");
    expect(templates).toContain('const { internalToolingCaptureRoutesEnabled } = useInternalToolingRouteAccess();');
    expect(templateDetail).toContain("import { useInternalToolingRouteAccess } from '../lib/internalToolingRoutes';");
    expect(templateDetail).toContain('const { internalToolingCaptureRoutesEnabled } = useInternalToolingRouteAccess();');
    expect(variantGallery).toContain("import { useInternalToolingRouteAccess } from '../../lib/internalToolingRoutes';");
    expect(variantGallery).toContain('const { internalToolingCaptureRoutesEnabled } = useInternalToolingRouteAccess();');
  });
});
