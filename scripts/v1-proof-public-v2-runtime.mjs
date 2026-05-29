#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = process.argv[2] || process.env.PLAYWRIGHT_BASE_URL || 'https://dayof.love';
const isLocalBaseUrl = /127\.0\.0\.1|localhost/i.test(baseUrl);
const templateAuditReportPath = path.join(process.cwd(), 'tmp', 'template-hardening-report.json');

const commands = [
  'npm test -- --run src/lib/publicBuilderV2Runtime.test.ts src/lib/publicBuilderV2WeddingData.test.ts src/lib/publicSiteProject.test.ts src/pages/SiteView.test.ts',
  `PLAYWRIGHT_BASE_URL=${JSON.stringify(baseUrl)} npm run test:e2e:public-quality`,
  `AUDIT_BASE_URL=${JSON.stringify(baseUrl)} node scripts/run_template_hardening_audit.mjs`,
];

async function assertLocalBaseUrlReady(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1_500) });
    if (response.ok) return;
    throw new Error(`received HTTP ${response.status}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Public V2 runtime proof requires a running preview/dev server at ${url}. Start the local runtime first, then rerun this proof. (${detail})`,
    );
  }
}

if (isLocalBaseUrl) {
  await assertLocalBaseUrlReady(baseUrl);
}

for (const command of commands) {
  execSync(command, { stdio: 'inherit', shell: '/bin/zsh' });
}

const audit = JSON.parse(fs.readFileSync(templateAuditReportPath, 'utf8'));
const templateAudit = audit?.templateAudit ?? {};
const strictVariantAudit = audit?.strictVariantAudit ?? {};
const readiness = audit?.readiness ?? {};

if (!readiness.templateReady || !readiness.strictVariantReady || !templateAudit.allDistinct) {
  throw new Error(
    `Template visual matrix is not fully green: templates ${templateAudit.passed ?? 0}/${templateAudit.total ?? 0}, ` +
    `distinct ${templateAudit.distinct ?? 0}/${templateAudit.total ?? 0}, ` +
    `strict variants ${strictVariantAudit.strictResolved ?? 0}/${strictVariantAudit.total ?? 0}.`,
  );
}
