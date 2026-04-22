import { describe, expect, it } from 'vitest';
import { buildCoordinatorExecutionBoard } from './coordinatorExecutionBoard';

describe('coordinatorExecutionBoard', () => {
  it('summarizes a recent timeline transition', () => {
    expect(buildCoordinatorExecutionBoard({
      label: 'Ceremony moved live and synced alert draft',
      panelFocus: 'timeline',
      targetId: 'evt-1',
      kind: 'transition',
    })).toEqual({
      statusLabel: 'Live transition just ran',
      tone: 'ready',
      lastMoveLabel: 'Ceremony moved live and synced alert draft',
      laneLabel: 'Timeline',
      effectLabel: 'Execution changed live state',
    });
  });

  it('shows neutral state when no execution feedback exists', () => {
    expect(buildCoordinatorExecutionBoard(null)).toEqual({
      statusLabel: 'No recent execution feedback',
      tone: 'neutral',
      lastMoveLabel: 'Board is waiting for the next operator move',
      laneLabel: 'No active execution lane',
      effectLabel: 'Run a board action to stamp the latest move here',
    });
  });
});
