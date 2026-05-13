import React from 'react';
import { DashboardPageHero } from '../../../components/dashboard/DashboardPageHero';
import type { PlannerAccessRole } from '../../../lib/plannerAccess';
import {
  CoordinatorAttentionPanel,
  CoordinatorCheckInQueuePanel,
  CoordinatorDayOfMessagePanel,
  CoordinatorDayOfSummaryPanel,
  CoordinatorGuestContinuityPanel,
  CoordinatorHandoffPanel,
  CoordinatorHelperAccessPanel,
  CoordinatorIssueDeskPanel,
  CoordinatorQnaPanel,
  CoordinatorRoleSelector,
  CoordinatorRunnerBoardPanel,
  CoordinatorShiftSnapshotPanel,
  CoordinatorStatCards,
  CoordinatorTimelinePanel,
} from './CoordinatorModePanels';

type CoordinatorRoleSelectorProps = React.ComponentProps<typeof CoordinatorRoleSelector>;
type CoordinatorStatCardsProps = React.ComponentProps<typeof CoordinatorStatCards>;
type CoordinatorAttentionPanelProps = Omit<React.ComponentProps<typeof CoordinatorAttentionPanel>, 'hasUncheckedGuests'>;
type CoordinatorHelperAccessPanelProps = React.ComponentProps<typeof CoordinatorHelperAccessPanel>;
type CoordinatorDayOfSummaryPanelProps = React.ComponentProps<typeof CoordinatorDayOfSummaryPanel>;
type CoordinatorCheckInQueuePanelProps = Omit<
  React.ComponentProps<typeof CoordinatorCheckInQueuePanel>,
  'onActiveGuestCheckIn' | 'onReadyNowClick' | 'onReviewOnlyClick'
>;
type CoordinatorTimelinePanelProps = React.ComponentProps<typeof CoordinatorTimelinePanel>;
type CoordinatorDayOfMessagePanelProps = React.ComponentProps<typeof CoordinatorDayOfMessagePanel>;
type CoordinatorQnaPanelProps = React.ComponentProps<typeof CoordinatorQnaPanel>;
type CoordinatorHandoffPanelProps = Omit<React.ComponentProps<typeof CoordinatorHandoffPanel>, 'coordinatorRole'>;
type CoordinatorIssueDeskPanelProps = React.ComponentProps<typeof CoordinatorIssueDeskPanel>;
type CoordinatorGuestContinuityPanelProps = React.ComponentProps<typeof CoordinatorGuestContinuityPanel>;
type CoordinatorRunnerBoardPanelProps = React.ComponentProps<typeof CoordinatorRunnerBoardPanel>;
type CoordinatorShiftSnapshotPanelProps = React.ComponentProps<typeof CoordinatorShiftSnapshotPanel>;

type Props = {
  coordinatorRole: PlannerAccessRole;
  hasUncheckedGuests: boolean;
  roleSelectorProps: CoordinatorRoleSelectorProps;
  statsCardProps: CoordinatorStatCardsProps;
  attentionPanelProps: CoordinatorAttentionPanelProps;
  handoffPanelProps: CoordinatorHandoffPanelProps;
  helperAccessPanelProps: CoordinatorHelperAccessPanelProps;
  issueDeskPanelProps: CoordinatorIssueDeskPanelProps;
  continuityPanelProps: CoordinatorGuestContinuityPanelProps;
  runnerBoardPanelProps: CoordinatorRunnerBoardPanelProps;
  shiftSnapshotPanelProps: CoordinatorShiftSnapshotPanelProps;
  dayOfSummaryPanelProps: CoordinatorDayOfSummaryPanelProps;
  checkInQueuePanelProps: CoordinatorCheckInQueuePanelProps;
  timelinePanelProps: CoordinatorTimelinePanelProps;
  dayOfMessagePanelProps: CoordinatorDayOfMessagePanelProps;
  qnaPanelProps: CoordinatorQnaPanelProps;
  onActiveGuestCheckIn: () => void;
  onReadyNowClick: () => void;
  onReviewOnlyClick: () => void;
};

export function CoordinatorDashboardRouteContent({
  coordinatorRole,
  hasUncheckedGuests,
  roleSelectorProps,
  statsCardProps,
  attentionPanelProps,
  handoffPanelProps,
  helperAccessPanelProps,
  issueDeskPanelProps,
  continuityPanelProps,
  runnerBoardPanelProps,
  shiftSnapshotPanelProps,
  dayOfSummaryPanelProps,
  checkInQueuePanelProps,
  timelinePanelProps,
  dayOfMessagePanelProps,
  qnaPanelProps,
  onActiveGuestCheckIn,
  onReadyNowClick,
  onReviewOnlyClick,
}: Props) {
  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <DashboardPageHero
        eyebrow="Day-of view"
        title="Give helpers the next useful thing, not every planning detail."
        description="Check-in, schedule updates, guest questions, and day-of messages stay focused so a planner or coordinator can act quickly."
        stats={[
          { label: 'Guests', value: statsCardProps.stats.total, detail: `${statsCardProps.stats.confirmed} attending` },
          { label: 'Checked in', value: statsCardProps.stats.checkedIn, detail: 'arrivals marked' },
          { label: 'Questions', value: qnaPanelProps.qnaCounts.open, detail: 'open guest questions' },
        ]}
        actions={<CoordinatorRoleSelector {...roleSelectorProps} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CoordinatorStatCards {...statsCardProps} />
        <CoordinatorAttentionPanel
          {...attentionPanelProps}
          hasUncheckedGuests={hasUncheckedGuests}
        />
      </div>

      <CoordinatorHandoffPanel coordinatorRole={coordinatorRole} {...handoffPanelProps} />

      <CoordinatorHelperAccessPanel {...helperAccessPanelProps} />

      <CoordinatorIssueDeskPanel {...issueDeskPanelProps} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <CoordinatorGuestContinuityPanel {...continuityPanelProps} />
        <CoordinatorRunnerBoardPanel {...runnerBoardPanelProps} />
      </div>

      <CoordinatorShiftSnapshotPanel {...shiftSnapshotPanelProps} />

      <CoordinatorDayOfSummaryPanel {...dayOfSummaryPanelProps} />

      {coordinatorRole === 'planner' && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
          Planner view is on. This view stays focused on guest movement, timeline decisions, and day-of updates.
        </div>
      )}
      {coordinatorRole === 'viewer' && (
        <div className="rounded-lg border border-border/40 bg-surface-subtle px-3 py-2 text-xs text-text-tertiary">
          Viewer mode is on - timeline, check-in, alerts, and Q&A edits are turned off here.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CoordinatorCheckInQueuePanel
          {...checkInQueuePanelProps}
          onActiveGuestCheckIn={onActiveGuestCheckIn}
          onReadyNowClick={onReadyNowClick}
          onReviewOnlyClick={onReviewOnlyClick}
        />

        <div className="space-y-4 rounded-xl border border-border-subtle bg-white p-4 shadow-sm">
          <CoordinatorTimelinePanel {...timelinePanelProps} />
          <CoordinatorDayOfMessagePanel {...dayOfMessagePanelProps} />
          <CoordinatorQnaPanel {...qnaPanelProps} />
        </div>
      </div>
    </div>
  );
}
