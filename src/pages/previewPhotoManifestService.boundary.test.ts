import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('preview photo manifest service boundary', () => {
  it('keeps preview capture pages off duplicated manifest fetch transport', () => {
    const templateScrollCapture = readSource('src/pages/TemplateScrollCapture.tsx');
    const variantPreviewCapture = readSource('src/pages/VariantPreviewCapture.tsx');
    const service = readSource('src/pages/previewPhotoManifestService.ts');

    expect(templateScrollCapture).toContain("from './previewPhotoManifestService'");
    expect(templateScrollCapture).toContain('loadPreviewPhotoManifest()');
    expect(templateScrollCapture).not.toContain("fetch('/preview-photos/manifest.json'");

    expect(variantPreviewCapture).toContain("from './previewPhotoManifestService'");
    expect(variantPreviewCapture).toContain('loadPreviewPhotoManifest()');
    expect(variantPreviewCapture).not.toContain("fetch('/preview-photos/manifest.json'");

    expect(service).toContain('/preview-photos/manifest.json');
  });
});
