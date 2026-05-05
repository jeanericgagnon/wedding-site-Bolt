export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadTextFile(filename: string, text: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function copyTextOrDownload(text: string, filename: string, mimeType?: string): Promise<'copied' | 'downloaded'> {
  const copied = await copyTextToClipboard(text);
  if (copied) return 'copied';
  downloadTextFile(filename, text, mimeType);
  return 'downloaded';
}
