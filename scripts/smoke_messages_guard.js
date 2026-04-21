#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve(process.cwd(), 'src/pages/dashboard/Messages.tsx');
const src = readFileSync(file, 'utf8');

const checks = [
  { name: 'compose permission helper imported', ok: src.includes('canComposeDashboardMessages') },
  { name: 'composer load is permission-gated', ok: src.includes("Your collaborator role cannot edit campaigns from Messaging.") },
  { name: 'follow-up creation is permission-gated', ok: src.includes("cannot create follow-up campaigns from Messaging") },
  { name: 'scheduled follow-up creation is permission-gated', ok: src.includes("cannot schedule follow-up campaigns from Messaging") },
  { name: 'retry path is permission-gated', ok: src.includes("cannot retry campaign sends") },
  { name: 'send-now path is permission-gated', ok: src.includes("cannot send campaigns from Messaging") },
  { name: 'reschedule path is permission-gated', ok: src.includes("cannot reschedule campaigns") },
  { name: 'unschedule path is permission-gated', ok: src.includes("cannot change scheduled campaigns") },
  { name: 'run-due-scheduled path is permission-gated', ok: src.includes("cannot run scheduled sends") },
];

const failures = checks.filter((check) => !check.ok);
if (failures.length) {
  console.error('messages guard failed');
  failures.forEach((failure) => console.error(`- ${failure.name}`));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checks: checks.map((check) => check.name) }, null, 2));
