import { execSync, spawn } from 'node:child_process';

const baseUrl = process.argv[2] || process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4178';
const ownerEmail = process.argv[3] || 'test@gmail.com';
const ownerPassword = process.argv[4] || '12345678';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureServer = async () => {
  try {
    const response = await fetch(`${baseUrl}/login`);
    if (response.ok) return { started: false };
  } catch {}

  const url = new URL(baseUrl);
  const child = spawn('npm', ['run', 'dev', '--', '--host', url.hostname, '--port', url.port], {
    stdio: 'ignore',
    detached: true,
  });
  child.unref();

  for (let i = 0; i < 20; i += 1) {
    await sleep(1000);
    try {
      const response = await fetch(`${baseUrl}/login`);
      if (response.ok) return { started: true };
    } catch {}
  }

  throw new Error(`Dev server did not come up at ${baseUrl}`);
};

const run = (label, command) => {
  try {
    const output = execSync(command, { stdio: 'pipe', encoding: 'utf8' });
    return { label, ok: true, output };
  } catch (error) {
    return {
      label,
      ok: false,
      output: error.stdout || '',
      error: error.stderr || error.message,
    };
  }
};

const collaboratorEmail = `matrix.collab.${Date.now()}@gmail.com`;

await ensureServer();

const results = [
  run('ai-regression-existing-site', `node scripts/playwright-ai-regression.mjs ${baseUrl} ${ownerEmail} ${ownerPassword} testandkaras`),
  run('ai-draft-generator-tests', 'npx vitest run src/lib/aiDraftGenerator.test.ts'),
  run('collaborator-flow', `node scripts/playwright-owner-create-invite-and-claim.mjs ${baseUrl} ${ownerEmail} ${ownerPassword} ${collaboratorEmail} 12345678`),
];

const summary = results.map((result) => ({
  label: result.label,
  ok: result.ok,
}));

console.log(JSON.stringify({ summary, results }, null, 2));

if (results.some((result) => !result.ok)) {
  process.exit(1);
}
