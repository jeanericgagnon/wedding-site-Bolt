#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'public';
const MAX_TOTAL_BYTES = 215_000_000;
const MAX_SINGLE_FILE_BYTES = 5_000_000;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(next));
      continue;
    }
    if (entry.isFile()) files.push(next);
  }

  return files;
}

const files = walk(ROOT).map((file) => {
  const size = fs.statSync(file).size;
  return { file, size };
});

const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
const oversizedFiles = files.filter((file) => file.size > MAX_SINGLE_FILE_BYTES);

const ok = totalBytes <= MAX_TOTAL_BYTES && oversizedFiles.length === 0;

const output = {
  ok,
  slice: 'asset-budget',
  summary: {
    fileCount: files.length,
    totalBytes,
    maxTotalBytes: MAX_TOTAL_BYTES,
    maxSingleFileBytes: MAX_SINGLE_FILE_BYTES,
  },
  largestFiles: [...files].sort((a, b) => b.size - a.size).slice(0, 10),
  oversizedFiles,
};

if (!ok) {
  console.error(JSON.stringify(output, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(output, null, 2));
