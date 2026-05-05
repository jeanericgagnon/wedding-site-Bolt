import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MAX_NEW_PAGE_LINES = 2000;

const baselineLimits = new Map([
  ['src/pages/RSVP.tsx', 2062],
  ['src/pages/dashboard/CoordinatorMode.tsx', 2840],
  ['src/pages/dashboard/GuestPhotoSharing.tsx', 3610],
  ['src/pages/dashboard/Guests.tsx', 5441],
  ['src/pages/dashboard/Messages.tsx', 4043],
  ['src/pages/dashboard/Settings.tsx', 2455],
  ['src/pages/dashboard/Seating.tsx', 2370],
  ['src/pages/dashboard/planning/NameChangePlannerTab.tsx', 2755],
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
  const source = readFileSync(path, 'utf8');
  if (source.length === 0) return 0;
  return (source.match(/\n/g) ?? []).length + (source.endsWith('\n') ? 0 : 1);
}

const files = walk('src/pages').sort();
const failures = [];
const oversized = [];

for (const file of files) {
  const lines = lineCount(file);
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

const result = {
  ok: failures.length === 0,
  maxNewPageLines: MAX_NEW_PAGE_LINES,
  baselineTrackedFiles: Array.from(baselineLimits.keys()),
  oversized,
  failures,
};

console.log(JSON.stringify(result, null, 2));

if (failures.length > 0) {
  process.exit(1);
}
