#!/usr/bin/env node

import fs from 'node:fs';

const budgets = [
  { file: 'src/pages/dashboard/Guests.tsx', maxLines: 5375 },
  { file: 'src/pages/dashboard/Messages.tsx', maxLines: 4295 },
  { file: 'src/pages/dashboard/Settings.tsx', maxLines: 2321 },
  { file: 'src/pages/RSVP.tsx', maxLines: 1955 },
  { file: 'src/pages/dashboard/CoordinatorMode.tsx', maxLines: 2993 },
  { file: 'src/pages/dashboard/Vault.tsx', maxLines: 1615 },
  { file: 'src/builder/components/TemplateGalleryPanel.tsx', maxLines: 1364 },
  { file: 'src/pages/Onboarding.tsx', maxLines: 1245 },
  { file: 'src/pages/onboarding/GuidedSetup.tsx', maxLines: 1232 },
  { file: 'src/pages/dashboard/Planning.tsx', maxLines: 828 },
  { file: 'src/pages/onboarding/QuickStart.tsx', maxLines: 672 },
];

function countLinesLikeWc(source) {
  const newlineMatches = source.match(/\n/g);
  return newlineMatches ? newlineMatches.length : 0;
}

const results = budgets.map(({ file, maxLines }) => {
  const lineCount = countLinesLikeWc(fs.readFileSync(file, 'utf8'));
  return {
    file,
    lineCount,
    maxLines,
    ok: lineCount <= maxLines,
  };
});

const failures = results.filter((result) => !result.ok);

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    slice: 'file-size-guard',
    failures,
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  slice: 'file-size-guard',
  summary: {
    checked: results.length,
  },
  results,
}, null, 2));
