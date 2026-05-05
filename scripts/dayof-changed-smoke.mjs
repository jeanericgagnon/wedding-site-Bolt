import { spawnSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const shouldRun = args.has('--run');
const includeAll = args.has('--all');

function gitDiff(namesOnlyArgs) {
  const result = spawnSync('git', namesOnlyArgs, { encoding: 'utf8' });
  if (result.status !== 0) return [];
  return result.stdout.split('\n').map((line) => line.trim()).filter(Boolean);
}

const changed = includeAll
  ? gitDiff(['ls-files'])
  : [
      ...gitDiff(['diff', '--name-only', '--diff-filter=ACMRTUXB', 'HEAD']),
      ...gitDiff(['ls-files', '--others', '--exclude-standard']),
    ];

const uniqueChanged = [...new Set(changed)];

const rules = [
  { test: /src\/pages\/(PhotoUpload|dashboard\/GuestPhotoSharing|EventRecap|EventHub|GuestbookSubmit)\.tsx|src\/lib\/aiPhotoOps|photo/i, specs: ['tests/e2e/photo-upload-write-read.spec.ts', 'tests/e2e/guest-hub-write-read.spec.ts'] },
  { test: /src\/pages\/(RSVP|EventRSVP|dashboard\/RsvpBoard)\.tsx|src\/lib\/guestImportParser|rsvp|guest/i, specs: ['tests/e2e/rsvp-write-read.spec.ts', 'tests/e2e/event-rsvp-write-read.spec.ts', 'tests/e2e/guest-import-write.spec.ts'] },
  { test: /src\/pages\/dashboard\/(Registry|Planning)\.tsx|registry/i, specs: ['tests/e2e/registry-write-read.spec.ts'] },
  { test: /src\/pages\/dashboard\/(Messages|Settings)\.tsx|sms|message/i, specs: ['tests/e2e/settings-notifications-config.spec.ts'] },
  { test: /src\/pages\/dashboard\/Seating\.tsx|seating/i, specs: ['tests/e2e/seating-write-read.spec.ts'] },
  { test: /src\/pages\/Vault|vault/i, specs: ['tests/e2e/vault-contribute-write-read.spec.ts'] },
  { test: /src\/builder\/|src\/pages\/SiteView|Template/i, specs: ['tests/e2e/public-site-quality.spec.ts', 'tests/e2e/launch-wording.spec.ts'] },
  { test: /src\/pages\/onboarding|Onboarding|QuickStart|GuidedSetup/i, specs: ['tests/e2e/quick-start-onboarding-write-read.spec.ts', 'tests/e2e/launch-wording.spec.ts'] },
  { test: /src\/pages\/Vendor|vendor/i, specs: ['tests/e2e/vendor-templates-smoke.spec.ts', 'tests/e2e/vendor-profile-publish-inquiry.spec.ts'] },
  { test: /src\/i18n|LanguageSwitcher/i, specs: ['tests/e2e/guest-i18n.spec.ts'] },
];

const selected = new Set(['tests/e2e/mobile-core-smoke.spec.ts', 'tests/e2e/launch-wording.spec.ts']);

for (const file of uniqueChanged) {
  for (const rule of rules) {
    if (rule.test.test(file)) {
      for (const spec of rule.specs) selected.add(spec);
    }
  }
}

const specs = [...selected].sort();
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5177';
const command = ['npx', 'playwright', 'test', '--workers=1', ...specs];

console.log('[dayof] Changed files considered:');
for (const file of uniqueChanged.slice(0, 120)) console.log(`- ${file}`);
if (uniqueChanged.length > 120) console.log(`- ...and ${uniqueChanged.length - 120} more`);

console.log('\n[dayof] Suggested smoke command:');
console.log(`PLAYWRIGHT_BASE_URL=${baseUrl} ${command.join(' ')}`);

if (shouldRun) {
  console.log('\n[dayof] Running suggested smoke...');
  const result = spawnSync(command[0], command.slice(1), {
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, PLAYWRIGHT_BASE_URL: baseUrl },
  });
  process.exit(result.status ?? 1);
}
