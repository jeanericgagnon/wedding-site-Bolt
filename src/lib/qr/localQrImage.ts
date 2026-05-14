import { BarcodeFormat, EncodeHintType, QRCodeWriter } from '@zxing/library';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildLocalQrSvgDataUrl(value: string, size = 512): string {
  const normalized = value.trim();
  if (!normalized) return '';

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

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges" role="img" aria-label="${escapeXml('QR code')}"><rect width="${width}" height="${height}" fill="#fff"/><path d="${paths.join('')}" fill="#111"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
