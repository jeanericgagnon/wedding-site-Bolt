#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve(process.cwd(), 'src/pages/dashboard/Guests.tsx');
const src = readFileSync(file, 'utf8');
const routeViewFile = resolve(process.cwd(), 'src/pages/dashboard/guests/GuestDashboardRouteView.tsx');
const routeViewSrc = readFileSync(routeViewFile, 'utf8');
const opsViewFile = resolve(process.cwd(), 'src/pages/dashboard/guests/GuestDashboardOpsView.tsx');
const opsViewSrc = readFileSync(opsViewFile, 'utf8');
const controlsFile = resolve(process.cwd(), 'src/pages/dashboard/guests/GuestSegmentControlsPanel.tsx');
const controlsSrc = readFileSync(controlsFile, 'utf8');
const toolbarFile = resolve(process.cwd(), 'src/pages/dashboard/guests/GuestOpsToolbar.tsx');
const toolbarSrc = readFileSync(toolbarFile, 'utf8');
const listPanelFile = resolve(process.cwd(), 'src/pages/dashboard/guests/GuestListPanel.tsx');
const listPanelSrc = readFileSync(listPanelFile, 'utf8');
const derivedStateFile = resolve(process.cwd(), 'src/pages/dashboard/guests/buildGuestDashboardDerivedState.ts');
const derivedStateSrc = readFileSync(derivedStateFile, 'utf8');
const uiStateFile = resolve(process.cwd(), 'src/pages/dashboard/guests/useGuestDashboardUiState.ts');
const uiStateSrc = readFileSync(uiStateFile, 'utf8');
const utilsFile = resolve(process.cwd(), 'src/pages/dashboard/guests/guestDashboardUtils.ts');
const utilsSrc = readFileSync(utilsFile, 'utf8');
const utilsTestFile = resolve(process.cwd(), 'src/pages/dashboard/guests/guestDashboardUtils.test.ts');
const utilsTestSrc = readFileSync(utilsTestFile, 'utf8');
const fullSrc = [src, routeViewSrc, opsViewSrc, controlsSrc, toolbarSrc, listPanelSrc, derivedStateSrc, uiStateSrc].join('\n');

const checks = [
  { name: 'check-in mode toggle exists', ok: fullSrc.includes('Check-in mode') },
  { name: 'checked-in filter exists', ok: fullSrc.includes("'checked-in'") },
  { name: 'check-in action exists', ok: fullSrc.includes('handleToggleCheckIn') && listPanelSrc.includes('Check in') },
  { name: 'clear all check-ins action exists', ok: fullSrc.includes('handleClearAllCheckIns') && fullSrc.includes('Clear all check-ins') },
  { name: 'export checked-in action exists', ok: fullSrc.includes('exportCheckedInCSV') && fullSrc.includes('Export checked-in guests') },
  { name: 'undo last check-in exists', ok: fullSrc.includes('handleUndoLastCheckIn') && fullSrc.includes('Last check-in:') },
  {
    name: 'unchecked-first sorting in check-in mode exists',
    ok:
      derivedStateSrc.includes('sortGuestsForDisplay') &&
      fullSrc.includes('checkInMode') &&
      utilsSrc.includes('aChecked ? 1 : -1') &&
      utilsTestSrc.includes('checkInMode: true') &&
      utilsTestSrc.includes("['a', 'p', 'z']"),
  },
];

const failures = checks.filter(c => !c.ok);
if (failures.length) {
  console.error('check-in guard failed');
  failures.forEach(f => console.error(`- ${f.name}`));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checks: checks.map(c => c.name) }, null, 2));
