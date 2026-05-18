import { BarcodeFormat, EncodeHintType, QRCodeWriter } from '@zxing/library';

export interface LocalQrSvgShape {
  width: number;
  height: number;
  path: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildLocalQrSvgDataUrl(value: string, size = 512): string {
  const svg = buildLocalQrSvgMarkup(value, size);
  if (!svg) return '';
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function buildLocalQrSvgMarkup(value: string, size = 512): string {
  const shape = buildLocalQrSvgShape(value, size);
  if (!shape) return '';

  const { width, height, path } = shape;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges" role="img" aria-label="${escapeXml('QR code')}"><rect width="${width}" height="${height}" fill="#fff"/><path d="${path}" fill="#111"/></svg>`;
}

export function buildLocalQrSvgShape(value: string, size = 512): LocalQrSvgShape | null {
  const normalized = value.trim();
  if (!normalized) return null;

  const writer = new QRCodeWriter();
  const matrix = writer.encode(
    normalized,
    BarcodeFormat.QR_CODE,
    size,
    size,
    new Map([[EncodeHintType.MARGIN, 1]]),
  );

  const width = matrix.getWidth();
  const height = matrix.getHeight();
  const paths: string[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (matrix.get(x, y)) {
        paths.push(`M${x},${y}h1v1h-1z`);
      }
    }
  }

  return {
    width,
    height,
    path: paths.join(''),
  };
}
