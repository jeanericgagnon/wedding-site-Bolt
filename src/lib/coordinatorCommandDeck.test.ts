import { describe, expect, it } from 'vitest';
import { buildCoordinatorCommandDeck } from './coordinatorCommandDeck';

describe('coordinatorCommandDeck', () => {
  it('marks the priority lane and keeps target context visible', () => {
    expect(buildCoordinatorCommandDeck({
      items: [
        { label: 'Check-in', detail: 'Board target' },
        { label: 'Timeline', detail: 'Working board event' },
        { label: 'Q&A', detail: 'Board question' },
        { label: 'Alerting', detail: 'Live alert ready' },
      ],
      priorityLabel: 'Timeline',
      priorityReason: 'the board event is waiting',
      priorityCta: 'Open live timeline',
      checkInTargetName: 'Alex Rivera',
      timelineTargetName: 'Ceremony',
      qnaTargetQuestion: 'Where do we park?',
      alertLaneLabel: 'Live event update',
    })).toEqual([
      {
        label: 'Check-in',
        detail: 'Board target',
        status: 'Standby',
        cta: 'Open queue',
        target: 'Alex Rivera',
        priority: false,
      },
      {
        label: 'Timeline',
        detail: 'Working board event',
        status: 'Priority · the board event is waiting',
        cta: 'Open live timeline',
        target: 'Ceremony',
        priority: true,
      },
      {
        label: 'Q&A',
        detail: 'Board question',
        status: 'Standby',
        cta: 'Open triage',
        target: 'Where do we park?',
        priority: false,
      },
      {
        label: 'Alerting',
        detail: 'Live alert ready',
        status: 'Standby',
        cta: 'Open alerts',
        target: 'Live event update',
        priority: false,
      },
    ]);
  });
});
