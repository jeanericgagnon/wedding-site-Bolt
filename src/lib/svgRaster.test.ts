import { describe, expect, it } from 'vitest';

import { buildSimpleImagePdfBytes } from './svgRaster';

describe('svgRaster pdf export', () => {
  it('builds a single-page pdf wrapper for image bytes', () => {
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const pdfBytes = buildSimpleImagePdfBytes(jpegBytes, 640, 480);
    const pdfText = new TextDecoder().decode(pdfBytes);

    expect(pdfText.startsWith('%PDF-1.4')).toBe(true);
    expect(pdfText).toContain('/Type /Catalog');
    expect(pdfText).toContain('/Type /Page');
    expect(pdfText).toContain('/Subtype /Image');
    expect(pdfText).toContain('/Filter /DCTDecode');
    expect(pdfText).toContain('/MediaBox [0 0 640 480]');
    expect(pdfText).toContain('startxref');
    expect(pdfBytes.length).toBeGreaterThan(jpegBytes.length);
  });
});
