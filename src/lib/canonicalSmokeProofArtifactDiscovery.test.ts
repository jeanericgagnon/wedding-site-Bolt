import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

type CanonicalSmokeOutput = {
  manualTruthPassMissing?: boolean;
  runtimeWordingVerificationMissing?: boolean;
  manualProofRequirements?: {
    canonicalCouplePath?: {
      evidenceLogPath?: string;
    };
    runtimeWordingVerification?: {
      evidenceLogPath?: string;
    };
  };
};

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempProofRoot() {
  const dir = mkdtempSync(join(tmpdir(), 'canonical-smoke-proof-root-'));
  tempDirs.push(dir);
  return dir;
}

describe('canonical smoke proof artifact discovery', () => {
  it('uses the newest mainstream proof runs instead of stale fixed paths', () => {
    const proofRoot = makeTempProofRoot();

    const oldCanonicalDir = join(proofRoot, 'canonical-couple-path-1777600000000');
    const newCanonicalDir = join(proofRoot, 'canonical-couple-path-1777700100000');
    const variantCanonicalDir = join(proofRoot, 'canonical-couple-path-hero-fallback-1779999999999');
    const oldWordingDir = join(proofRoot, 'runtime-wording-truth-1777600000000');
    const newWordingDir = join(proofRoot, 'runtime-wording-truth-1779379660884');

    mkdirSync(oldCanonicalDir, { recursive: true });
    mkdirSync(newCanonicalDir, { recursive: true });
    mkdirSync(variantCanonicalDir, { recursive: true });
    mkdirSync(oldWordingDir, { recursive: true });
    mkdirSync(newWordingDir, { recursive: true });

    writeFileSync(join(oldCanonicalDir, 'route-notes.md'), 'old canonical');
    writeFileSync(join(newCanonicalDir, 'route-notes.md'), 'new canonical');
    writeFileSync(join(variantCanonicalDir, 'route-notes.md'), 'variant canonical');
    writeFileSync(join(oldWordingDir, 'notes.md'), 'old wording');
    writeFileSync(join(newWordingDir, 'notes.md'), 'new wording');

    const output = execFileSync('node', ['scripts/v1-proof-canonical-smoke.mjs'], {
      encoding: 'utf8',
      env: {
        ...process.env,
        V1_PROOF_CANONICAL_SMOKE_SKIP_STEPS: '1',
        V1_PROOF_SCREENSHOTS_ROOT: proofRoot,
      },
    });

    const parsed = JSON.parse(output) as CanonicalSmokeOutput;

    expect(parsed.manualTruthPassMissing).toBe(false);
    expect(parsed.runtimeWordingVerificationMissing).toBe(false);
    expect(parsed.manualProofRequirements?.canonicalCouplePath?.evidenceLogPath).toContain(
      'canonical-couple-path-1777700100000/route-notes.md',
    );
    expect(parsed.manualProofRequirements?.canonicalCouplePath?.evidenceLogPath).not.toContain(
      'hero-fallback',
    );
    expect(parsed.manualProofRequirements?.runtimeWordingVerification?.evidenceLogPath).toContain(
      'runtime-wording-truth-1779379660884/notes.md',
    );
  });
});
