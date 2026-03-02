#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve(process.cwd(), 'src/pages/dashboard/Guests.tsx');
const src = readFileSync(file, 'utf8');

const checks = [
  { name: 'check-in mode toggle exists', ok: src.includes('Check-in mode') },
  { name: 'checked-in filter exists', ok: src.includes("'checked-in'") },
  { name: 'check-in action exists', ok: src.includes('handleToggleCheckIn') && src.includes('Check in') },
  { name: 'clear all check-ins action exists', ok: src.includes('handleClearAllCheckIns') && src.includes('Clear all check-ins') },
  { name: 'export checked-in action exists', ok: src.includes('exportCheckedInCSV') && src.includes('Export checked-in guests') },
  { name: 'undo last check-in exists', ok: src.includes('handleUndoLastCheckIn') && src.includes('Last check-in:') },
  { name: 'unchecked-first sorting in check-in mode exists', ok: src.includes('displayedGuests = checkInMode') && src.includes('aChecked ? 1 : -1') },
];

const failures = checks.filter(c => !c.ok);
if (failures.length) {
  console.error('check-in guard failed');
  failures.forEach(f => console.error(`- ${f.name}`));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checks: checks.map(c => c.name) }, null, 2));
