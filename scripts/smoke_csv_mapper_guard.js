#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readSource(path) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const guestsSrc = readSource('src/pages/dashboard/Guests.tsx');
const toolbarSrc = readSource('src/pages/dashboard/guests/GuestOpsToolbar.tsx');
const modalSrc = readSource('src/pages/dashboard/guests/GuestCsvImportModals.tsx');
const routeViewSrc = readSource('src/pages/dashboard/guests/GuestDashboardRouteView.tsx');
const overlaysSrc = readSource('src/pages/dashboard/guests/GuestDashboardOverlays.tsx');
const viewPropsSrc = readSource('src/pages/dashboard/guests/buildGuestDashboardViewProps.ts');
const src = [guestsSrc, toolbarSrc, modalSrc, routeViewSrc, overlaysSrc, viewPropsSrc].join('\n');

const checks = [
  {
    name: 'csv file input exists',
    ok: src.includes('ref={csvFileInputRef}') && src.includes('type="file"'),
  },
  {
    name: 'csv input uses onChange import handler',
    ok:
      (guestsSrc.includes('onChange={importCSV}'))
      || (
        (guestsSrc.includes('onFileChange: importCSV') || guestsSrc.includes('onFileChange={importCSV}'))
        && toolbarSrc.includes('onChange={onFileChange}')
      ),
  },
  {
    name: 'csv input does not use onInput duplicate trigger',
    ok: !src.includes('onInput={(e) => importCSV') && !src.includes('onInput={onFileChange}'),
  },
  {
    name: 'map columns modal present',
    ok: src.includes('Match columns') && src.includes('Continue to Review'),
  },
  {
    name: 'name mapping guard present',
    ok:
      (
        src.includes('Please map First Name + Last Name, or use Full Name instead.')
        || src.includes('Map First Name + Last Name, or use Full Name instead.')
      )
      && src.includes('csvNameMappingValid'),
  },
];

const failures = checks.filter((c) => !c.ok);

if (failures.length > 0) {
  console.error('csv mapper guard failed');
  for (const f of failures) console.error(`- ${f.name}`);
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checks: checks.map((c) => c.name) }, null, 2));
