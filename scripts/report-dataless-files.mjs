#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, lstatSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const shouldHydrate = args.includes('--hydrate');
const shouldJson = args.includes('--json');
const sampleSizeArg = args.find((arg) => arg.startsWith('--sample='));
const sampleSize = sampleSizeArg ? Number.parseInt(sampleSizeArg.split('=')[1] ?? '', 10) : 50;
const roots = args.filter((arg) => !['--hydrate', '--json'].includes(arg) && !arg.startsWith('--sample='));
const scanRoots = roots.length > 0 ? roots : ['package.json', '.git/HEAD', '.git/config', '.git/index', 'src/pages/onboarding', 'src/pages/Onboarding.tsx'];
const repoRoot = process.cwd();

const listFiles = (target) => {
  const absolute = resolve(repoRoot, target);
  if (!existsSync(absolute)) return [];

  const stat = lstatSync(absolute);
  if (stat.isDirectory()) {
    const output = execFileSync('find', [absolute, '-type', 'f'], { encoding: 'utf8' });
    return output.split('\n').filter(Boolean);
  }

  return [absolute];
};

const inspectFile = (filePath) => {
  try {
    const output = execFileSync('stat', ['-f', '%z\t%b\t%f\t%N', filePath], { encoding: 'utf8' }).trim();
    const [sizeText, blocksText, flagsText, name] = output.split('\t');
    const size = Number(sizeText);
    const blocks = Number(blocksText);
    const flags = Number(flagsText);

    return {
      blocks,
      flags,
      name,
      size,
      isDataless: size > 0 && blocks === 0,
    };
  } catch (error) {
    return {
      blocks: 0,
      flags: 0,
      name: filePath,
      size: 0,
      isDataless: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const files = [...new Set(scanRoots.flatMap(listFiles))];
const getDatalessEntries = () => files.map(inspectFile).filter((entry) => entry.isDataless);

const printEntries = (entries) => {
  if (shouldJson) {
    console.log(JSON.stringify({
      count: entries.length,
      sample: entries.slice(0, sampleSize),
      truncated: entries.length > sampleSize,
    }, null, 2));
    return;
  }

  for (const entry of entries.slice(0, sampleSize)) {
    console.log(`${entry.name}\tsize=${entry.size}\tblocks=${entry.blocks}\tflags=${entry.flags}`);
  }

  if (entries.length > sampleSize) {
    console.error(`[dataless] ${entries.length - sampleSize} additional files omitted. Re-run with --sample=${entries.length} to print all.`);
  }
};

const dataless = getDatalessEntries();
printEntries(dataless);

if (shouldHydrate && dataless.length > 0) {
  const result = spawnSync('brctl', ['download', ...dataless.map((entry) => entry.name)], {
    encoding: 'utf8',
    stdio: 'inherit',
  });

  process.exitCode = result.status ?? 1;

  const afterHydrate = getDatalessEntries();
  const hydratedCount = dataless.length - afterHydrate.length;
  console.error(`[dataless] before=${dataless.length} after=${afterHydrate.length} hydrated=${hydratedCount}`);
}
