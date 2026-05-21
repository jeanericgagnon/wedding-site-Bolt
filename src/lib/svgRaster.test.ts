import { describe, expect, it, vi } from 'vitest';

import { buildSimpleImagePdfBytes, downloadBlob } from './svgRaster';

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

  it('attaches blob downloads before clicking and cleans them up after', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pdf-export');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    try {
      downloadBlob('seating.pdf', new Blob(['pdf'], { type: 'application/pdf' }));

      const link = document.querySelector<HTMLAnchorElement>('a[download="seating.pdf"]');
      expect(link).not.toBeNull();
      expect(link?.href).toBe('blob:pdf-export');
      expect(click).toHaveBeenCalledTimes(1);

      vi.runAllTimers();

      expect(document.querySelector('a[download="seating.pdf"]')).toBeNull();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:pdf-export');
    } finally {
      vi.useRealTimers();
      createObjectURL.mockRestore();
      revokeObjectURL.mockRestore();
      click.mockRestore();
    }
  });
});
