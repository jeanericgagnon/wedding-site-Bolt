import { spawnSync } from 'node:child_process';

const suites = {
  gate: [
    ['npm', ['run', 'proof:v1:board:freshness']],
    ['npm', ['run', 'typecheck', '--', '--pretty', 'false']],
    ['npm', ['run', 'lint', '--', '--quiet']],
    ['git', ['diff', '--check']],
    ['npm', ['run', 'build']],
  ],
  proof: [
    ['npm', ['run', 'proof:v1:board:freshness']],
    ['npm', ['run', 'proof:v1:board']],
    ['npm', ['run', 'proof:v1:board:md']],
    ['npm', ['run', 'proof:v1:guests-rsvp-ops']],
    ['npm', ['run', 'proof:v1:comms-center']],
    ['npm', ['run', 'proof:v1:registry']],
    ['npm', ['run', 'proof:v1:seating-continuity']],
    ['npm', ['run', 'proof:v1:coordinator-dayof']],
    ['npm', ['run', 'proof:v1:collaborator-access']],
  ],
};

function run(command, args) {
  const label = `${command} ${args.join(' ')}`;
  console.log(`\n[dayof] ${label}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(`\n[dayof] Failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

const suiteName = process.argv[2] || 'gate';
const suite = suites[suiteName];

if (!suite) {
  console.error(`[dayof] Unknown suite "${suiteName}". Use one of: ${Object.keys(suites).join(', ')}`);
  process.exit(1);
}

for (const [command, args] of suite) {
  run(command, args);
}

console.log(`\n[dayof] ${suiteName} complete.`);
