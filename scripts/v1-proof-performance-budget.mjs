import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const distAssetsDir = join(process.cwd(), 'dist', 'assets');

const budgets = {
  jsMaxKb: 350,
  jsReviewKb: 250,
  cssMaxKb: 175,
};

function kb(bytes) {
  return Number((bytes / 1024).toFixed(2));
}

function collectAssets() {
  if (!existsSync(distAssetsDir)) {
    throw new Error('dist/assets is missing. Run `npm run build` before `npm run proof:v1:performance-budget`.');
  }

  return readdirSync(distAssetsDir)
    .filter((name) => /\.(js|css)$/.test(name))
    .map((name) => {
      const filePath = join(distAssetsDir, name);
      const sizeKb = kb(statSync(filePath).size);
      const ext = name.endsWith('.css') ? 'css' : 'js';
      return {
        name,
        type: ext,
        sizeKb,
        status: ext === 'css'
          ? (sizeKb <= budgets.cssMaxKb ? 'pass' : 'fail')
          : (sizeKb <= budgets.jsReviewKb ? 'pass' : sizeKb <= budgets.jsMaxKb ? 'review' : 'fail'),
      };
    })
    .sort((a, b) => b.sizeKb - a.sizeKb);
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
  largestJs,
  largestCss,
  review,
  failures,
};

console.log(JSON.stringify(result, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}

