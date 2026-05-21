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
    <div className="space-y-6">
      <DashboardPageHero
        eyebrow="Day-of"
        title="Everything helpers need on the wedding day."
        description="Search guests, open QR codes, check the timeline, and share the packet from one place."
        stats={[
          { label: 'Guest lookup', value: 'Live', detail: `${statsCardProps.stats.total} guests searchable` },
          { label: 'QR packet', value: hasUncheckedGuests ? 'Needs review' : 'Live', detail: hasUncheckedGuests ? 'Guest flow still needs attention' : 'Helper flow is ready' },
          { label: 'Timeline', value: 'Live', detail: `${qnaPanelProps.qnaCounts.open} open guest questions` },
        ]}
        actions={<CoordinatorRoleSelector {...roleSelectorProps} />}
      />

      <section className="rounded-[20px] border border-border-subtle bg-white p-4 shadow-none">
        <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Phase</p>
          <span className="rounded-full border border-border-subtle bg-surface-subtle/30 px-3 py-1">Before</span>
          <strong className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 font-semibold text-text-primary">Wedding weekend</strong>
          <span className="rounded-full border border-border-subtle bg-surface-subtle/30 px-3 py-1">After</span>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_320px]">
        <article className="rounded-[20px] border border-border-subtle bg-white p-5 shadow-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Search-first lookup</p>
              <h2 className="mt-3 font-serif text-2xl font-normal text-text-primary">Find any guest fast.</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">Guest name, table, meal, household, and review-needed state all stay close when the room gets busy.</p>
            </div>
            <button
              type="button"
              onClick={onReadyNowClick}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              Open lookup
            </button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[20px] border border-border-subtle bg-surface-subtle/30 p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-tertiary">Guests</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{statsCardProps.stats.total} searchable</p>
            </div>
            <div className="rounded-[20px] border border-border-subtle bg-surface-subtle/30 p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-tertiary">Checked in</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{statsCardProps.stats.checkedIn} marked</p>
            </div>
            <div className="rounded-[20px] border border-border-subtle bg-surface-subtle/30 p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-tertiary">Open questions</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{qnaPanelProps.qnaCounts.open} waiting</p>
            </div>
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[20px] border border-border-subtle bg-white p-5 shadow-none">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">QR + print packet</p>
            <h3 className="mt-3 font-serif text-xl font-normal text-text-primary">One packet for helpers.</h3>
            <p className="mt-2 text-sm leading-6 text-text-secondary">Guest lookup, photo upload QR, schedule, key contacts, and venue notes stay together.</p>
            <button
              type="button"
              onClick={onReviewOnlyClick}
              className="mt-4 text-sm font-semibold text-primary"
            >
              Build packet
            </button>
          </article>

          <article className="rounded-[20px] border border-border-subtle bg-white p-5 shadow-none">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Unified flow</p>
            <h3 className="mt-3 font-serif text-xl font-normal text-text-primary">Preview, share, print.</h3>
            <div className="mt-4 space-y-3 text-sm text-text-secondary">
              <div className="rounded-[20px] border border-border-subtle bg-surface-subtle/30 p-4">1. Preview packet and guest lookup</div>
              <div className="rounded-[20px] border border-border-subtle bg-surface-subtle/30 p-4">2. Share the helper link with family or planners</div>
              <div className="rounded-[20px] border border-border-subtle bg-surface-subtle/30 p-4">3. Print QR codes, notes, and timing</div>
            </div>
          </article>
        </aside>
      </section>

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
        <div className="rounded-[20px] border border-primary/20 bg-primary/5 p-4 text-sm shadow-none">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Planner view</p>
          <p className="mt-3 font-medium text-primary">Guest movement, timeline decisions, and day-of updates stay in focus here.</p>
          <p className="mt-2 leading-6 text-primary/80">This mode keeps the coordinator surface centered on the live decisions a planner usually needs most once the weekend starts moving.</p>
        </div>
      )}
      {coordinatorRole === 'viewer' && (
        <div className="rounded-[20px] border border-border-subtle bg-surface-subtle/30 p-4 text-sm text-text-secondary shadow-none">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Read-only view</p>
          <p className="mt-3 leading-6">Timeline, check-in, alerts, and Q&A stay visible for reference here, while the live edits remain with the people running the room.</p>
        </div>
      )}

      <section className="rounded-[20px] border border-border-subtle bg-white p-5 shadow-none">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Live floor workspace</p>
            <h2 className="mt-3 font-serif text-2xl font-normal text-text-primary">Work the queue, keep the timeline close, and answer questions without losing the room.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              This lower workspace is where the live queue, timing shifts, helper messages, and open guest questions stay together once the day is actually in motion.
            </p>
          </div>
          <div className="inline-flex flex-wrap gap-2 text-xs text-text-tertiary">
            <span className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-3 py-1">Check-in queue</span>
            <span className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-3 py-1">Timeline changes</span>
            <span className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-3 py-1">Guest questions</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <CoordinatorCheckInQueuePanel
          {...checkInQueuePanelProps}
          onActiveGuestCheckIn={onActiveGuestCheckIn}
          onReadyNowClick={onReadyNowClick}
          onReviewOnlyClick={onReviewOnlyClick}
        />

        <div className="space-y-4 rounded-[20px] border border-border-subtle bg-white p-4 shadow-none">
          <CoordinatorTimelinePanel {...timelinePanelProps} />
          <CoordinatorDayOfMessagePanel {...dayOfMessagePanelProps} />
          <CoordinatorQnaPanel {...qnaPanelProps} />
        </div>
      </div>
    </div>
  );
}
