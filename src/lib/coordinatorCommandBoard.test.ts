import { describe, expect, it } from 'vitest';
import { buildCoordinatorCommandBoard } from './coordinatorCommandBoard';

describe('coordinatorCommandBoard', () => {
  it('summarizes a non-alerting live priority with a queued second action', () => {
    expect(buildCoordinatorCommandBoard({
      priority: 'Check-in',
      reason: 'door review is waiting',
      targetReason: 'on Alex Rivera',
      cta: 'Open door review',
      secondary: 'Timeline',
      primaryActionTitle: 'Resolve the next door exception',
    })).toEqual({
      statusLabel: 'Check-in is the live priority',
      tone: 'warning',
      firstActionLabel: 'Open door review · Check-in',
      firstTargetLabel: 'Resolve the next door exception on Alex Rivera',
      secondActionLabel: 'Then check Timeline',
      reasonLabel: 'door review is waiting',
    });
  });

  it('treats alerting as a ready pacing surface when nothing hotter exists', () => {
    expect(buildCoordinatorCommandBoard({
      priority: 'Alerting',
      reason: 'live event update is ready to send',
      targetReason: null,
      cta: 'Open alert draft',
      secondary: null,
      primaryActionTitle: 'Board is under control',
    })).toEqual({
      statusLabel: 'Command board is pacing the room',
      tone: 'ready',
      firstActionLabel: 'Open alert draft · Alerting',
      firstTargetLabel: 'Board is under control',
      secondActionLabel: 'No second priority queued',
      reasonLabel: 'live event update is ready to send',
    });
  });
});
