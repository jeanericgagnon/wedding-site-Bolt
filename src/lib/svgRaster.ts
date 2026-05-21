function waitForImageLoad(image: HTMLImageElement): Promise<void> {
  return new Promise((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Could not render this export right now.'));
  });
}

function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = 'sync';
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return waitForImageLoad(image).then(() => image);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not save this export right now.'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

async function renderSvgToCanvas(svg: string): Promise<HTMLCanvasElement> {
  const image = await loadSvgImage(svg);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width || 1080;
  canvas.height = image.naturalHeight || image.height || 1920;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare this export right now.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasToTypedArrayBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not save this export right now.'));
        return;
      }
      resolve(blob);
    }, mimeType, quality);
  });
}

export async function rasterizeSvgToPngBlob(svg: string): Promise<Blob> {
  const canvas = await renderSvgToCanvas(svg);
  return await canvasToBlob(canvas);
}

async function rasterizeSvgToJpegBytes(svg: string): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const canvas = await renderSvgToCanvas(svg);
  const jpegBlob = await canvasToTypedArrayBlob(canvas, 'image/jpeg', 0.92);
  const bytes = new Uint8Array(await jpegBlob.arrayBuffer());
  return {
    bytes,
    width: canvas.width,
    height: canvas.height,
  };
}

export function buildSimpleImagePdfBytes(imageBytes: Uint8Array, width: number, height: number): Uint8Array {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [0];
  let length = 0;

  const pushText = (text: string) => {
    const bytes = encoder.encode(text);
    parts.push(bytes);
    length += bytes.length;
  };

  const pushBytes = (bytes: Uint8Array) => {
    parts.push(bytes);
    length += bytes.length;
  };

  const startObject = (id: number) => {
    offsets[id] = length;
    pushText(`${id} 0 obj\n`);
  };

  pushText('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  startObject(1);
  pushText('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  startObject(2);
  pushText('<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n');

  startObject(3);
  pushText(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`);

  startObject(4);
  pushText(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`);
  pushBytes(imageBytes);
  pushText('\nendstream\nendobj\n');

  const content = `q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\n`;
  const contentBytes = encoder.encode(content);
  startObject(5);
  pushText(`<< /Length ${contentBytes.length} >>\nstream\n`);
  pushBytes(contentBytes);
  pushText('endstream\nendobj\n');

  const xrefOffset = length;
  pushText(`xref\n0 6\n0000000000 65535 f \n`);
  for (let id = 1; id <= 5; id += 1) {
    pushText(`${String(offsets[id] ?? 0).padStart(10, '0')} 00000 n \n`);
  }
  pushText(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const output = new Uint8Array(length);
  let cursor = 0;
  for (const part of parts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  return output;
}

export async function rasterizeSvgToPdfBlob(svg: string): Promise<Blob> {
  const { bytes, width, height } = await rasterizeSvgToJpegBytes(svg);
  const pdfBytes = buildSimpleImagePdfBytes(bytes, width, height);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 0);
}
