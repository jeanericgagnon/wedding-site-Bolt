import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type ProofBoardOutput = {
  activeUngatedLaunchBlockers?: string[];
  blockedOrApprovalGatedLaunchItems?: string[];
  summary?: {
    secondaryTrustGap?: string;
  };
  ruthlessNextThree?: Array<{
    id?: string;
    status?: string;
    manualProof?: string[];
  }>;
  slices?: Array<{
    id?: string;
    localWordingEvidence?: string;
    manualProof?: string[];
  }>;
};

const getLatestVerifiedDeploy = () => {
  const proofLog = readFileSync('docs/v1-smoke-proof-log.md', 'utf8');
  return proofLog.match(/_Latest verified deploy:_ `([^`]+)`/)?.[1];
};

const getLatestRuntimeWordingEvidence = () => {
  const root = join('docs', 'proof-screenshots');
  const candidates: Array<{ suffix: number; notesPath: string }> = [];

  for (const dateDir of readdirSync(root, { withFileTypes: true })) {
    if (!dateDir.isDirectory()) continue;
    const datePath = join(root, dateDir.name);

    for (const proofDir of readdirSync(datePath, { withFileTypes: true })) {
      if (!proofDir.isDirectory() || !proofDir.name.startsWith('runtime-wording-truth-')) continue;

      const suffix = Number(proofDir.name.replace('runtime-wording-truth-', ''));
      const notesPath = join(datePath, proofDir.name, 'notes.md');
      if (Number.isFinite(suffix) && existsSync(notesPath)) {
        candidates.push({ suffix, notesPath });
      }
    }
  }

  return candidates.sort((a, b) => b.suffix - a.suffix)[0]?.notesPath;
};

describe('proof board freshness', () => {
  it('uses the current deploy and latest runtime wording evidence', () => {
    const expectedDeploy = getLatestVerifiedDeploy();
    const expectedEvidence = getLatestRuntimeWordingEvidence();

    expect(expectedDeploy).toBeTruthy();
    expect(expectedEvidence).toBeTruthy();

    const output = execFileSync('node', ['scripts/v1-proof-board.mjs'], {
      encoding: 'utf8',
    });
    const board = JSON.parse(output) as ProofBoardOutput;
    const sitewideBugTesting = board.ruthlessNextThree?.find((item) => item.id === 'sitewide-bug-testing');
    const aiProductAudit = board.ruthlessNextThree?.find((item) => item.id === 'ai-product-audit');
    const publicSiteTrust = board.slices?.find((slice) => slice.id === 'public-site-trust');

    expect(board.summary?.secondaryTrustGap).toContain(expectedDeploy);
    expect(board.activeUngatedLaunchBlockers).toEqual([
      'strict-p0-secure-service-role-queue-storage-proof',
    ]);
    expect(board.blockedOrApprovalGatedLaunchItems?.join('\n')).not.toContain('secure-env model-backed AI');
    expect(board.blockedOrApprovalGatedLaunchItems?.join('\n')).toContain('external OpenAI key rotation');
    expect(board.blockedOrApprovalGatedLaunchItems?.join('\n')).not.toContain('secure service-role storage');
    expect(sitewideBugTesting?.status).toBe('LATEST_LIVE_SITEWIDE_PASS_GREEN_KEEP_REGRESSION_TESTING');
    expect(aiProductAudit?.status).toBe('AI_PRODUCT_AUDIT_LIVE_GREEN_SECURE_MODEL_PROOF_GREEN');
    expect(aiProductAudit?.manualProof?.join('\n')).toContain('AI/photo sensitive-column migration');
    expect(publicSiteTrust?.localWordingEvidence).toBe(expectedEvidence);
    expect(publicSiteTrust?.manualProof?.join('\n')).toContain(expectedEvidence);
  });
});
