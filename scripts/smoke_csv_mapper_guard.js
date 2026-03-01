#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve(process.cwd(), 'src/pages/dashboard/Guests.tsx');
const src = readFileSync(file, 'utf8');

const checks = [
  {
    name: 'csv file input exists',
    ok: src.includes('ref={csvFileInputRef}') && src.includes('type="file"'),
  },
  {
    name: 'csv input uses onChange import handler',
    ok: src.includes('onChange={importCSV}'),
  },
  {
    name: 'csv input does not use onInput duplicate trigger',
    ok: !src.includes('onInput={(e) => importCSV'),
  },
  {
    name: 'map columns modal present',
    ok: src.includes('Map Columns') && src.includes('Continue to Review'),
  },
  {
    name: 'name mapping guard present',
    ok: src.includes('Map both First Name and Last Name before continuing.') && src.includes('csvNameMappingValid'),
  },
];

const failures = checks.filter((c) => !c.ok);

if (failures.length > 0) {
  console.error('csv mapper guard failed');
  for (const f of failures) console.error(`- ${f.name}`);
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checks: checks.map((c) => c.name) }, null, 2));
