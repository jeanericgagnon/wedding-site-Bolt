import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MAX_NEW_PAGE_LINES = 2000;

const baselineLimits = new Map([
  ['src/pages/RSVP.tsx', 1962],
  ['src/pages/dashboard/CoordinatorMode.tsx', 2736],
  ['src/pages/dashboard/GuestPhotoSharing.tsx', 3168],
  ['src/pages/dashboard/Guests.tsx', 4693],
  ['src/pages/dashboard/Messages.tsx', 3386],
  ['src/pages/dashboard/Settings.tsx', 2328],
  ['src/pages/dashboard/Seating.tsx', 2169],
  ['src/pages/dashboard/planning/NameChangePlannerTab.tsx', 2414],
]);

function walk(dir) {
  const entries = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      entries.push(...walk(fullPath));
      continue;
    }
    if (/\.(test|spec)\.(tsx|ts)$/.test(entry)) continue;
    if (/\.(tsx|ts)$/.test(entry)) entries.push(fullPath);
  }
  return entries;
}

function lineCount(path) {
  const stats = statSync(path);
  let source = '';
  try {
    source = readFileSync(path, 'utf8');
  } catch (error) {
    if (stats.size > 0 && stats.blocks === 0) {
      return null;
    }
    throw error;
  }

  if (source.length === 0) return 0;
  return (source.match(/\n/g) ?? []).length + (source.endsWith('\n') ? 0 : 1);
}

const files = walk('src/pages').sort();
const failures = [];
const oversized = [];
const datalessFiles = [];

for (const file of files) {
  const lines = lineCount(file);
  if (lines === null) {
    datalessFiles.push(file);
    continue;
  }

  const baseline = baselineLimits.get(file);
  if (baseline) {
    oversized.push({ file, lines, baseline, status: lines <= baseline ? 'within_baseline' : 'grew_past_baseline' });
    if (lines > baseline) failures.push(`${file} has ${lines} lines, above its baseline guard of ${baseline}.`);
    continue;
  }
  if (lines > MAX_NEW_PAGE_LINES) {
    oversized.push({ file, lines, baseline: MAX_NEW_PAGE_LINES, status: 'new_oversized_page' });
    failures.push(`${file} has ${lines} lines; new page files must stay at or below ${MAX_NEW_PAGE_LINES}.`);
  }
}

if (datalessFiles.length > 0) {
  failures.push(`${datalessFiles.length} src/pages files are dataless/offloaded locally, so the file-size guard cannot read them. Hydrate those files and rerun this guard.`);
}

const result = {
  ok: failures.length === 0,
  maxNewPageLines: MAX_NEW_PAGE_LINES,
  baselineTrackedFiles: Array.from(baselineLimits.keys()),
  oversized,
  datalessUnreadable: {
    count: datalessFiles.length,
    sample: datalessFiles.slice(0, 25),
    truncated: datalessFiles.length > 25,
  },
  failures,
};

console.log(JSON.stringify(result, null, 2));

if (failures.length > 0) {
  process.exit(1);
}
