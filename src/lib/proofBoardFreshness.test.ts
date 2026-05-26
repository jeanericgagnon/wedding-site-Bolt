import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

type ProofBoardOutput = {
  source?: string;
  currentState?: Record<string, string>;
  currentStateFreshness?: {
    status?: string;
    warning?: string;
    ageHours?: number;
  };
  activeUngatedLaunchBlockers?: string[];
  summary?: {
    currentProofState?: string;
    currentNextActions?: string;
  };
  sections?: Record<string, string>;
};

const read = (path: string) => readFileSync(path, 'utf8');
const FRESH_GENERATED_AT = '2026-05-26 11:22 PM PT';

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

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('proof board freshness', () => {
  it('derives the board from the current backlog truth', () => {
    const backlog = read('BACKLOG.md');
    const expectedState = parseCurrentStateTable(backlog);
    const expectedBlockers = extractCurrentLaunchBlockers(backlog);

    const output = execFileSync('node', ['scripts/v1-proof-board.mjs'], {
      encoding: 'utf8',
      env: {
        ...process.env,
        V1_PROOF_BOARD_GENERATED_AT: FRESH_GENERATED_AT,
      },
    });
    const board = JSON.parse(output) as ProofBoardOutput;

    expect(board.source).toBe('BACKLOG.md');
    expect(board.currentState).toMatchObject(expectedState);
    expect(board.activeUngatedLaunchBlockers ?? []).toEqual(expectedBlockers);
    expect(board.currentStateFreshness?.status).toBe('FRESH');
    expect(board.summary?.currentProofState).toContain('proof:v1:canonical-smoke');
    expect(board.summary?.currentProofState).toContain('proof:v1:guests-rsvp-ops');
    expect(board.summary?.currentNextActions ?? '').toContain('proof:v1:board:freshness');
    expect(board.activeUngatedLaunchBlockers ?? []).toEqual([]);
    expect(board.sections?.['Current Canonical Status']).toContain('| Current launch verdict | `GO` |');
    expect(board.sections?.['Current Canonical Status']).toContain('| Production-ready | `YES FOR THE CURRENT PUBLIC / GUEST / RSVP LAUNCH SCOPE` |');
    expect(board.sections?.['Deployment Matrix']).toContain('guest-contact-lookup');
  });

  it('prints a compact freshness line for the helper mode', () => {
    const output = execFileSync(
      'node',
      ['scripts/v1-proof-board.mjs', '--freshness-only', '--require-fresh-current-state'],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          V1_PROOF_BOARD_GENERATED_AT: FRESH_GENERATED_AT,
        },
      },
    );

    expect(output.trim()).toBe('[proof:v1:board] FRESH: Current state metadata is fresh.');
  });

  it('fails loudly when a stale backlog snapshot is supplied', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'proof-board-freshness-'));
    tempDirs.push(tempDir);

    const staleBacklogPath = join(tempDir, 'BACKLOG.md');
    const staleBacklog = read('BACKLOG.md').replace(
      '| Current date/time | `2026-05-26 11:22 PM PDT` |',
      '| Current date/time | `2026-05-15 02:26 PM PDT` |',
    );
    writeFileSync(staleBacklogPath, staleBacklog);

    const result = spawnSync(
      'node',
      ['scripts/v1-proof-board.mjs', '--freshness-only', '--require-fresh-current-state'],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          V1_PROOF_BOARD_BACKLOG_PATH: staleBacklogPath,
          V1_PROOF_BOARD_GENERATED_AT: FRESH_GENERATED_AT,
        },
      },
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('[proof:v1:board] STALE:');
    expect(result.stderr).toContain('Current state metadata is stale; update BACKLOG.md before treating either proof:v1:board output as fresh launch truth.');
  });
});
