import { describe, expect, it } from 'vitest';
import { buildCoordinatorCommandSummary } from './coordinatorCommandSummary';

describe('coordinatorCommandSummary', () => {
  it('surfaces live priority, targets, and ready signals for command row items', () => {
    expect(buildCoordinatorCommandSummary({
      checkInLabel: 'Working board target',
      timelineLabel: 'Board event available',
      qnaLabel: 'No board question',
      alertLabel: 'Board-aligned sms lane',
      priorityLabel: 'Check-in',
      checkInTargetName: 'Alex Rivera',
      timelineTargetName: 'Ceremony seating',
      qnaTargetQuestion: null,
      alertLaneLabel: 'SMS lane',
    })).toEqual([
      {
        label: 'Check-in',
        detail: 'Working board target',
        targetLabel: 'Alex Rivera',
        statusLabel: 'Live priority',
        tone: 'priority',
      },
      {
        label: 'Timeline',
        detail: 'Board event available',
        targetLabel: 'Ceremony seating',
        statusLabel: 'Queued',
        tone: 'ready',
      },
      {
        label: 'Q&A',
        detail: 'No board question',
        targetLabel: 'No guest question selected',
        statusLabel: 'Monitoring',
        tone: 'neutral',
      },
      {
        label: 'Alerting',
        detail: 'Board-aligned sms lane',
        targetLabel: 'SMS lane',
        statusLabel: 'Ready to send',
        tone: 'ready',
      },
    ]);
  });

  it('marks manual alerting as needing review when it is not the priority', () => {
    expect(buildCoordinatorCommandSummary({
      checkInLabel: null,
      timelineLabel: null,
      qnaLabel: null,
      alertLabel: 'Manual override on email lane',
      priorityLabel: 'Timeline',
      checkInTargetName: null,
      timelineTargetName: null,
      qnaTargetQuestion: null,
      alertLaneLabel: 'Email lane',
    })).toEqual([
      {
        label: 'Alerting',
        detail: 'Manual override on email lane',
        targetLabel: 'Email lane',
        statusLabel: 'Needs review',
        tone: 'neutral',
      },
    ]);
  });
});
