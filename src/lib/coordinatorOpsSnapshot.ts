import type { PlannerAccessRole } from './plannerAccess';

export type CoordinatorOpsSnapshotTone = 'neutral' | 'warning' | 'success';
export type CoordinatorOpsSnapshotKey = 'check-in' | 'timeline' | 'qna' | 'alerting';

export type CoordinatorOpsSnapshotItem = {
  key: CoordinatorOpsSnapshotKey;
  title: string;
  detail: string;
  cta: string;
  tone: CoordinatorOpsSnapshotTone;
  locked: boolean;
};

export const buildCoordinatorOpsSnapshot = ({
  role,
  reviewCount,
  nextArrivalName,
  liveEventName,
  upNextEventName,
  openQnaCount,
  preferredAlertLabel,
  alertAligned,
  canScheduleAlerts,
}: {
  role: PlannerAccessRole;
  reviewCount: number;
  nextArrivalName: string | null;
  liveEventName: string | null;
  upNextEventName: string | null;
  openQnaCount: number;
  preferredAlertLabel: string | null;
  alertAligned: boolean;
  canScheduleAlerts: boolean;
}): CoordinatorOpsSnapshotItem[] => {
  const locked = role === 'viewer';

  const checkIn: CoordinatorOpsSnapshotItem = reviewCount > 0
    ? {
        key: 'check-in',
        title: 'Check-in',
        detail: `${reviewCount} guest${reviewCount === 1 ? '' : 's'} need review before check-in.`,
        cta: locked ? 'View door queue' : 'Resolve door queue',
        tone: 'warning',
        locked,
      }
    : nextArrivalName
      ? {
          key: 'check-in',
          title: 'Check-in',
          detail: `${nextArrivalName} is the next ready arrival at the door.`,
          cta: locked ? 'View next arrival' : 'Open next arrival',
          tone: 'neutral',
          locked,
        }
      : {
          key: 'check-in',
          title: 'Check-in',
          detail: 'The door is clear right now.',
          cta: 'Review door board',
          tone: 'success',
          locked,
        };

  const timeline: CoordinatorOpsSnapshotItem = liveEventName
    ? {
        key: 'timeline',
        title: 'Timeline',
        detail: `${liveEventName} is active right now.`,
        cta: locked ? 'View active event' : 'Open active event',
        tone: 'success',
        locked,
      }
    : upNextEventName
      ? {
          key: 'timeline',
          title: 'Timeline',
          detail: `${upNextEventName} is up next and ready for transition.`,
          cta: locked ? 'View up-next event' : 'Prep next event',
          tone: 'warning',
          locked,
        }
      : {
          key: 'timeline',
          title: 'Timeline',
          detail: 'No run-of-show event is active yet.',
          cta: 'Review timeline',
          tone: 'neutral',
          locked,
        };

  const qna: CoordinatorOpsSnapshotItem = openQnaCount > 0
    ? {
        key: 'qna',
        title: 'Guest Q&A',
        detail: `${openQnaCount} guest question${openQnaCount === 1 ? '' : 's'} still need an answer.`,
        cta: locked ? 'View guest questions' : 'Answer next question',
        tone: 'warning',
        locked,
      }
    : {
        key: 'qna',
        title: 'Guest Q&A',
        detail: 'No open guest questions are waiting.',
        cta: 'Review answered questions',
        tone: 'success',
        locked,
      };

  const alerting: CoordinatorOpsSnapshotItem = locked
    ? {
        key: 'alerting',
        title: 'Alerting',
        detail: 'Viewer access can review the day-of message lane but cannot send updates.',
        cta: 'Review message lane',
        tone: 'neutral',
        locked: true,
      }
    : preferredAlertLabel
      ? {
          key: 'alerting',
          title: 'Alerting',
          detail: alertAligned
            ? `${preferredAlertLabel} is ready in the day-of message lane.`
            : `${preferredAlertLabel} is recommended, but the draft is currently customized.`,
          cta: alertAligned ? 'Send board update' : 'Re-align alert draft',
          tone: alertAligned ? 'success' : 'warning',
          locked: false,
        }
      : {
          key: 'alerting',
          title: 'Alerting',
          detail: canScheduleAlerts
            ? 'Use this lane for live updates or scheduled day-of follow-through.'
            : 'Use this lane for live updates; scheduled sends stay with planners and the couple.',
          cta: 'Open message lane',
          tone: 'neutral',
          locked: false,
        };

  return [checkIn, timeline, qna, alerting];
};
