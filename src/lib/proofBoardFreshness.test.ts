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
    expect(board.activeUngatedLaunchBlockers ?? []).toEqual([]);
    expect(board.summary?.currentProofState).toContain('public-access-coverage');
    expect(board.summary?.currentProofState).toContain('launch-closeout');
    expect(board.summary?.currentNextActions ?? '').toBe('');
    expect(board.ruthlessNextThree?.[0]?.title).toContain('legacy `layout_config` fallback');
    expect(board.ruthlessNextThree?.[0]?.status).toBe('READY_WHEN_SECURE_ENV_EXISTS');
    expect(board.ruthlessNextThree?.[2]?.title).toContain('secure service-role queue/storage proof');
    expect(board.currentState?.['Reason production-ready is not yet claimed']).toContain('secure service-role proof');
    expect(board.sections?.['Current Canonical Status']).toContain('| Launch verdict | `HOLD` |');
    expect(board.sections?.['Validation Matrix']).toContain('LIVE PASS');
    expect(board.sections?.['Deployment Matrix']).toContain('public-site-access');
  });
});
