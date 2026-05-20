import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const distAssetsDir = join(process.cwd(), 'dist', 'assets');
const distHtmlPath = join(process.cwd(), 'dist', 'index.html');

const budgets = {
  jsMaxKb: 350,
  jsReviewKb: 250,
  cssMaxKb: 175,
  lazyJsReviewKb: 350,
  lazyJsMaxKb: 550,
};

function kb(bytes) {
  return Number((bytes / 1024).toFixed(2));
}

function collectAssets() {
  if (!existsSync(distAssetsDir)) {
    throw new Error('dist/assets is missing. Run `npm run build` before `npm run proof:v1:performance-budget`.');
  }
  if (!existsSync(distHtmlPath)) {
    throw new Error('dist/index.html is missing. Run `npm run build` before `npm run proof:v1:performance-budget`.');
  }

  const launchAssets = collectLaunchAssetNames();

  return readdirSync(distAssetsDir)
    .filter((name) => /\.(js|css)$/.test(name))
    .map((name) => {
      const filePath = join(distAssetsDir, name);
      const sizeKb = kb(statSync(filePath).size);
      const ext = name.endsWith('.css') ? 'css' : 'js';
      const isLaunchAsset = launchAssets.has(name);
      const launchStatus = ext === 'css'
        ? (sizeKb <= budgets.cssMaxKb ? 'pass' : 'fail')
        : (sizeKb <= budgets.jsReviewKb ? 'pass' : sizeKb <= budgets.jsMaxKb ? 'review' : 'fail');
      const lazyStatus = ext === 'css'
        ? (sizeKb <= budgets.cssMaxKb ? 'pass' : 'review')
        : (sizeKb <= budgets.lazyJsReviewKb ? 'pass' : sizeKb <= budgets.lazyJsMaxKb ? 'review' : 'fail');
      return {
        name,
        type: ext,
        sizeKb,
        phase: isLaunchAsset ? 'launch' : 'lazy',
        status: isLaunchAsset ? launchStatus : lazyStatus,
      };
    })
    .sort((a, b) => b.sizeKb - a.sizeKb);
}

function collectLaunchAssetNames() {
  const html = existsSync(distHtmlPath) ? readFileSync(distHtmlPath) : '';
  const names = new Set();
  const pattern = /<(?:script|link)\b[^>]+(?:src|href)="\/assets\/([^"]+)"/g;
  let match;
  while ((match = pattern.exec(html))) {
    if (match[1]) names.add(match[1]);
  }
  return names;
}

const assets = collectAssets();
const failures = assets.filter((asset) => asset.status === 'fail');
const review = assets.filter((asset) => asset.status === 'review');
const largestJs = assets.filter((asset) => asset.type === 'js').slice(0, 12);
const largestCss = assets.filter((asset) => asset.type === 'css').slice(0, 4);

const result = {
  generatedAt: new Date().toISOString(),
  budgets,
  status: failures.length === 0 ? 'pass' : 'fail',
  summary: {
    assetCount: assets.length,
    reviewCount: review.length,
    failureCount: failures.length,
  },
  contractSummary: failures.length === 0
    ? 'Performance budget proof is green: this build-artifact lane guards shipped asset weight and review thresholds, but it remains supporting release evidence rather than a feature-runtime truth source by itself.'
    : 'Performance budget proof is not green: shipped asset weight or review thresholds regressed and must be fixed before broader release claims stay credible.',
  largestJs,
  largestCss,
  review,
  failures,
};

console.log(JSON.stringify(result, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
