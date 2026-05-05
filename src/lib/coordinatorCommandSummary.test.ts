import { describe, expect, it } from 'vitest';
import { buildCoordinatorCommandSummary } from './coordinatorCommandSummary';

describe('coordinatorCommandSummary', () => {
  it('surfaces live priority, targets, and next actions for command row items', () => {
    expect(buildCoordinatorCommandSummary({
      checkInLabel: 'Suggested guest in progress',
      timelineLabel: 'Suggested event waiting',
      qnaLabel: 'No suggested question',
      alertLabel: 'Board-aligned sms lane',
      priorityLabel: 'Check-in',
      checkInTargetName: 'Alex Rivera',
      timelineTargetName: 'Ceremony seating',
      qnaTargetQuestion: null,
      alertLaneLabel: 'SMS lane',
    })).toEqual([
      {
        label: 'Check-in',
        detail: 'Suggested guest in progress',
        targetLabel: 'Alex Rivera',
        statusLabel: 'Live priority',
        actionLabel: 'Review Alex Rivera now',
        tone: 'priority',
      },
      {
        label: 'Timeline',
        detail: 'Suggested event waiting',
        targetLabel: 'Ceremony seating',
        statusLabel: 'Queued',
        actionLabel: 'Prep Ceremony seating',
        tone: 'ready',
      },
      {
        label: 'Q&A',
        detail: 'No suggested question',
        targetLabel: 'No guest question selected',
        statusLabel: 'Monitoring',
        actionLabel: 'Monitor guest questions',
        tone: 'neutral',
      },
      {
        label: 'Alerting',
        detail: 'Board-aligned sms lane',
        targetLabel: 'SMS lane',
        statusLabel: 'Ready to send',
        actionLabel: 'Review SMS lane draft',
        tone: 'ready',
      },
    ]);
  });

  it('marks manual alerting as needing review and exposes the recovery action', () => {
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
        actionLabel: 'Realign Email lane',
        tone: 'neutral',
      },
    ]);
  });
});
