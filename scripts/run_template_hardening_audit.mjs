#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const templateManifestPath = path.join(repoRoot, 'public', 'template-previews', 'manifest.json');
const variantManifestPath = path.join(repoRoot, 'public', 'variant-previews', 'manifest.json');
const outPath = path.join(repoRoot, 'tmp', 'template-hardening-report.json');
const baseUrl = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:4173';
const isLocalBaseUrl = /127\.0\.0\.1|localhost/i.test(baseUrl);

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function sha(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function assertLocalBaseUrlReady(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1_500) });
    if (response.ok) return;
    throw new Error(`received HTTP ${response.status}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Template hardening audit requires a running preview/dev server at ${url}. Start the local runtime first, then rerun this audit. (${detail})`,
    );
  }
}

const templateManifest = readJson(templateManifestPath);
const variantManifest = readJson(variantManifestPath);

const leakTokens = [
  'alex & sam',
  'emma & olivia',
  'john & jane',
  'your wedding website',
  'demo couple',
];

const requiredTokens = ['kara & eric', 'sayulita'];

if (isLocalBaseUrl) {
  await assertLocalBaseUrlReady(baseUrl);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 2200 } });

const templateRows = [];
for (const tpl of templateManifest.previews || []) {
  const url = `${baseUrl}/template-scroll-capture?templateId=${encodeURIComponent(tpl.id)}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('#template-scroll-root[data-template-scroll-ready="true"]', { timeout: 30000 });

  const text = (await page.locator('#template-scroll-root').innerText()).toLowerCase();
  const sectionHtml = await page.evaluate(() => {
    const root = document.querySelector('#template-scroll-root');
    if (!root) return '';
    return Array.from(root.children)
      .slice(1)
      .map((el) => (el instanceof HTMLElement ? el.outerHTML : ''))
      .join('\n');
  });

  templateRows.push({
    templateId: tpl.id,
    requiredTokenHits: requiredTokens.filter((t) => text.includes(t)),
    leakHits: leakTokens.filter((t) => text.includes(t)),
    sectionHash: sha(sectionHtml),
  });
}

const hashCounts = new Map();
for (const row of templateRows) {
  hashCounts.set(row.sectionHash, (hashCounts.get(row.sectionHash) || 0) + 1);
}
for (const row of templateRows) {
  row.distinct = hashCounts.get(row.sectionHash) === 1;
  row.pass = row.requiredTokenHits.length === requiredTokens.length && row.leakHits.length === 0 && row.distinct;
}

const variantRows = [];
for (const item of variantManifest.items || []) {
  const [, variant = 'default'] = String(item.variantKey || '').split(':');
  const sectionType = item.sectionType;
  const url = `${baseUrl}/variant-preview-capture?sectionType=${encodeURIComponent(sectionType)}&variant=${encodeURIComponent(variant)}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('#variant-preview-root[data-variant-preview-ready="true"]', { timeout: 30000 });
  const missingExact = await page.locator('text=Missing exact section variant').count();
  variantRows.push({
    sectionType,
    variant,
    strictResolved: missingExact === 0,
  });
}

await browser.close();

const templatesTotal = templateRows.length;
const templatesPass = templateRows.filter((r) => r.pass).length;
const distinctCount = templateRows.filter((r) => r.distinct).length;

const variantsTotal = variantRows.length;
const variantsStrictPass = variantRows.filter((r) => r.strictResolved).length;

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  templateAudit: {
    total: templatesTotal,
    passed: templatesPass,
    distinct: distinctCount,
    allDistinct: distinctCount === templatesTotal,
    allPassed: templatesPass === templatesTotal,
    rows: templateRows,
  },
  strictVariantAudit: {
    total: variantsTotal,
    strictResolved: variantsStrictPass,
    strictFailed: variantsTotal - variantsStrictPass,
    failedRows: variantRows.filter((r) => !r.strictResolved),
  },
  readiness: {
    templateReady: templatesPass === templatesTotal,
    strictVariantReady: variantsStrictPass === variantsTotal,
  },
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`Wrote ${outPath}`);
console.log(`Templates pass ${templatesPass}/${templatesTotal}, distinct ${distinctCount}/${templatesTotal}`);
console.log(`Strict variants ${variantsStrictPass}/${variantsTotal}`);
