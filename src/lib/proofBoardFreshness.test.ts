import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type ProofBoardOutput = {
  source?: string;
  currentState?: Record<string, string>;
  activeUngatedLaunchBlockers?: string[];
  summary?: {
    currentProofState?: string;
    currentNextActions?: string;
  };
  ruthlessNextThree?: Array<{
    title?: string;
    status?: string;
  }>;
  sections?: Record<string, string>;
};

const read = (path: string) => readFileSync(path, 'utf8');

const parseCurrentStateTable = (text: string) => {
  const lines = text.split(/\r?\n/);
  const state: Record<string, string> = {};
  let inTable = false;

  for (const line of lines) {
    if (!inTable) {
      if (line.trim() === '| Field | Current State |') {
        inTable = true;
      }
      continue;
    }

    if (!line.startsWith('|')) break;
    if (line.includes('---')) continue;

    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length === 2) {
      state[cells[0]] = cells[1];
    }
  }

  return state;
};

describe('proof board freshness', () => {
  it('derives the board from the current backlog truth', () => {
    const backlog = read('BACKLOG.md');
    const expectedState = parseCurrentStateTable(backlog);

    const output = execFileSync('node', ['scripts/v1-proof-board.mjs'], {
      encoding: 'utf8',
    });
    const board = JSON.parse(output) as ProofBoardOutput;

    expect(board.source).toBe('BACKLOG.md');
    expect(board.currentState).toMatchObject(expectedState);
    expect(board.activeUngatedLaunchBlockers).toEqual([
      'Secure Service-Role Queue/Storage Deep Proof',
      'Secure Email / Queue-Processing Deep Proof',
    ]);
    expect(board.summary?.currentProofState).toContain('canonical-smoke');
    expect(board.summary?.currentProofState).toContain('public-quality');
    expect(board.summary?.currentNextActions).toContain('secure service-role proof');
    expect(board.ruthlessNextThree?.[0]?.title).toContain('Provide `SUPABASE_SERVICE_ROLE_KEY`');
    expect(board.ruthlessNextThree?.[0]?.status).toBe('READY_WHEN_SECURE_ENV_EXISTS');
    expect(board.sections?.['Current Canonical Status']).toContain('single public site resolver');
    expect(board.sections?.['Current Validation Matrix']).toContain('LIVE PASS');
    expect(board.sections?.['Deployment Status']).toContain('public-site-access');
  });
});
