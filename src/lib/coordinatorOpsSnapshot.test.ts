import { describe, expect, it } from 'vitest';
import { buildCoordinatorOpsSnapshot } from './coordinatorOpsSnapshot';

describe('coordinatorOpsSnapshot', () => {
  it('surfaces review pressure and alert override for active coordinator roles', () => {
    expect(buildCoordinatorOpsSnapshot({
      role: 'coordinator',
      reviewCount: 2,
      nextArrivalName: 'Alex Rivera',
      liveEventName: null,
      upNextEventName: 'Ceremony',
      openQnaCount: 3,
      preferredAlertLabel: 'Ceremony update',
      alertAligned: false,
      canScheduleAlerts: false,
    })).toEqual([
      {
        key: 'check-in',
        title: 'Check-in',
        detail: '2 guests need review before check-in.',
        cta: 'Resolve door queue',
        tone: 'warning',
        locked: false,
      },
      {
        key: 'timeline',
        title: 'Timeline',
        detail: 'Ceremony is up next and ready for transition.',
        cta: 'Prep next event',
        tone: 'warning',
        locked: false,
      },
      {
        key: 'qna',
        title: 'Guest Q&A',
        detail: '3 guest questions still need an answer.',
        cta: 'Answer next question',
        tone: 'warning',
        locked: false,
      },
      {
        key: 'alerting',
        title: 'Alerting',
        detail: 'Ceremony update is recommended, but the draft is currently customized.',
        cta: 'Re-align alert draft',
        tone: 'warning',
        locked: false,
      },
    ]);
  });

  it('downgrades all lanes into read-only cues for viewers', () => {
    expect(buildCoordinatorOpsSnapshot({
      role: 'viewer',
      reviewCount: 0,
      nextArrivalName: 'Sam Lee',
      liveEventName: 'Cocktail Hour',
      upNextEventName: 'Reception',
      openQnaCount: 0,
      preferredAlertLabel: 'Cocktail hour update',
      alertAligned: true,
      canScheduleAlerts: false,
    })).toEqual([
      {
        key: 'check-in',
        title: 'Check-in',
        detail: 'Sam Lee is the next ready arrival at the door.',
        cta: 'View next arrival',
        tone: 'neutral',
        locked: true,
      },
      {
        key: 'timeline',
        title: 'Timeline',
        detail: 'Cocktail Hour is active right now.',
        cta: 'View active event',
        tone: 'success',
        locked: true,
      },
      {
        key: 'qna',
        title: 'Guest Q&A',
        detail: 'No open guest questions are waiting.',
        cta: 'Review answered questions',
        tone: 'success',
        locked: true,
      },
      {
        key: 'alerting',
        title: 'Alerting',
        detail: 'Viewer access can review the day-of message lane but cannot send updates.',
        cta: 'Review message lane',
        tone: 'neutral',
        locked: true,
      },
    ]);
  });
});
