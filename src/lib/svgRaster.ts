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

export async function rasterizeSvgToPngBlob(svg: string): Promise<Blob> {
  const image = await loadSvgImage(svg);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width || 1080;
  canvas.height = image.naturalHeight || image.height || 1920;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare this export right now.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return await canvasToBlob(canvas);
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
