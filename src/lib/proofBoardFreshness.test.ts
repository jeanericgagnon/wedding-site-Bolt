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

const extractCurrentLaunchBlockers = (text: string) => {
  const match = text.match(/## Current Launch Blockers\s+([\s\S]*?)(?=\n## |\s*$)/);
  if (!match) return [];
  return [...match[1].matchAll(/^### (.+)$/gm)].map((entry) => entry[1].trim());
};

describe('proof board freshness', () => {
  it('derives the board from the current backlog truth', () => {
    const backlog = read('BACKLOG.md');
    const expectedState = parseCurrentStateTable(backlog);
    const expectedBlockers = extractCurrentLaunchBlockers(backlog);

    const output = execFileSync('node', ['scripts/v1-proof-board.mjs'], {
      encoding: 'utf8',
    });
    const board = JSON.parse(output) as ProofBoardOutput;

    expect(board.source).toBe('BACKLOG.md');
    expect(board.currentState).toMatchObject(expectedState);
    expect(board.activeUngatedLaunchBlockers ?? []).toEqual(expectedBlockers);
    expect(board.summary?.currentProofState).toContain('public-access-coverage');
    expect(board.summary?.currentProofState).toContain('launch-closeout');
    expect(board.summary?.currentProofState).toContain('Release Launch Gate');
    expect(board.summary?.currentNextActions ?? '').toContain('apply/deploy the nine local RPC batches');
    expect(board.activeUngatedLaunchBlockers ?? []).toEqual([]);
    expect(board.currentState?.['Current blockers']).toBe('none');
    expect(board.currentState?.['Reason production-ready is not yet claimed']).toContain('No active P0/P1 blockers remain');
    expect(board.sections?.['Current Canonical Status']).toContain('| Current launch verdict | `GO` |');
    expect(board.sections?.['Current Canonical Status']).toContain('| Production-ready | `YES` |');
    expect(board.sections?.['Validation Matrix']).toContain('LIVE PASS');
    expect(board.sections?.['Deployment Matrix']).toContain('guest-contact-lookup');
  });
});
