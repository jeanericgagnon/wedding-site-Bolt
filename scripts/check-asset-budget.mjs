import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC_ROOT = 'public';
const MAX_PUBLIC_KIB = 210_000;
const MAX_PUBLIC_FILE_KIB = 5_000;

const mediaExtensions = new Set([
  '.apng',
  '.avif',
  '.gif',
  '.jpeg',
  '.jpg',
  '.mov',
  '.mp4',
  '.png',
  '.svg',
  '.webm',
  '.webp',
]);

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    files.push({ path: fullPath, bytes: stats.size });
  }
  return files;
}

function extensionOf(path) {
  const lastDot = path.lastIndexOf('.');
  return lastDot >= 0 ? path.slice(lastDot).toLowerCase() : '';
}

const files = walk(PUBLIC_ROOT);
const mediaFiles = files.filter((file) => mediaExtensions.has(extensionOf(file.path)));
const totalKiB = Math.ceil(files.reduce((sum, file) => sum + file.bytes, 0) / 1024);
const largest = files
  .map((file) => ({ file: file.path, kib: Math.ceil(file.bytes / 1024) }))
  .sort((a, b) => b.kib - a.kib)
  .slice(0, 20);

const failures = [];
if (totalKiB > MAX_PUBLIC_KIB) {
  failures.push(`public assets total ${totalKiB} KiB, above budget ${MAX_PUBLIC_KIB} KiB.`);
}

for (const asset of largest) {
  if (asset.kib > MAX_PUBLIC_FILE_KIB) {
    failures.push(`${asset.file} is ${asset.kib} KiB, above per-file budget ${MAX_PUBLIC_FILE_KIB} KiB.`);
  }
}

const result = {
  ok: failures.length === 0,
  publicRoot: PUBLIC_ROOT,
  maxPublicKiB: MAX_PUBLIC_KIB,
  maxPublicFileKiB: MAX_PUBLIC_FILE_KIB,
  totalKiB,
  fileCount: files.length,
  mediaFileCount: mediaFiles.length,
  largest,
  failures,
};

console.log(JSON.stringify(result, null, 2));

if (failures.length > 0) {
  process.exit(1);
}
