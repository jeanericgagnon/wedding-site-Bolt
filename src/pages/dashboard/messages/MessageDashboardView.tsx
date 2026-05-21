import { type ComponentProps } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { DashboardPageHero } from '../../../components/dashboard/DashboardPageHero';
import { Button } from '../../../components/ui';
import {
  MessageComposerCard,
  MessageGuestFlowCard,
  MessageHistoryCard,
  MessageReachSnapshotCard,
  MessageSavedTemplatesCard,
  MessageSendingDetailsPanel,
  MessageStartingPointsCard,
  ToastList,
} from '../../../components/dashboard/messages/MessageDashboardComponents';
import { MessageDetailModal } from './MessageDetailModal';
import type { PlannerAccessRole } from '../../../lib/plannerAccess';

interface MessageDashboardViewProps {
  activeSiteRole: PlannerAccessRole;
  composerProps: ComponentProps<typeof MessageComposerCard>;
  deliveryRate: number;
  detailModalProps: ComponentProps<typeof MessageDetailModal> | null;
  guestsReached: number;
  historyProps: ComponentProps<typeof MessageHistoryCard>;
  messagesRole: PlannerAccessRole;
  onRunDueScheduledMessages: () => void;
  onSetMessagesRole: (role: PlannerAccessRole) => void;
  overdueScheduled: number;
  processingScheduled: boolean;
  reachSnapshotProps: ComponentProps<typeof MessageReachSnapshotCard>;
  savedTemplatesProps: ComponentProps<typeof MessageSavedTemplatesCard>;
  scheduledCount: number;
  sendingDetailsProps: ComponentProps<typeof MessageSendingDetailsPanel>;
  showSendingDetails: boolean;
  startingPointsProps: ComponentProps<typeof MessageStartingPointsCard>;
  toasts: ComponentProps<typeof ToastList>['toasts'];
  toggleSendingDetails: () => void;
}

export function MessageDashboardView({
  activeSiteRole,
  composerProps,
  deliveryRate,
  detailModalProps,
  guestsReached,
  historyProps,
  messagesRole,
  onRunDueScheduledMessages,
  onSetMessagesRole,
  overdueScheduled,
  processingScheduled,
  reachSnapshotProps,
  savedTemplatesProps,
  scheduledCount,
  sendingDetailsProps,
  showSendingDetails,
  startingPointsProps,
  toasts,
  toggleSendingDetails,
}: MessageDashboardViewProps) {
  return (
    <DashboardLayout currentPage="messages">
      <div className="space-y-7">
        <DashboardPageHero
          eyebrow="Messages"
          title="Updates guests can actually use."
          description="Send reminders, schedule changes, photo links, and thank-you notes without turning your wedding into a group chat."
          stats={[
            { label: 'Scheduled', value: scheduledCount > 0 ? `${scheduledCount} waiting` : 'Nothing waiting', detail: 'ready when needed' },
            { label: 'Reach', value: guestsReached > 0 ? `${guestsReached} guests reached` : 'Ready to send', detail: 'across sent updates' },
            { label: 'Delivery', value: `${deliveryRate}% healthy`, detail: 'latest send status' },
          ]}
          actions={
            <div className="flex flex-col gap-3 md:items-end">
              <Button
                variant={overdueScheduled > 0 ? 'primary' : 'outline'}
                size="sm"
                onClick={onRunDueScheduledMessages}
                disabled={processingScheduled || !composerProps.canCompose}
              >
                {processingScheduled
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running due sends…</>
                  : <><Clock className="w-4 h-4 mr-2" />{overdueScheduled > 0 ? `Send ${overdueScheduled} scheduled update${overdueScheduled !== 1 ? 's' : ''}` : 'Review scheduled updates'}</>}
              </Button>
              <div>
                <label className="block text-xs text-text-tertiary mb-1">View as</label>
                <select
                  value={messagesRole}
                  onChange={(e) => onSetMessagesRole(e.target.value as PlannerAccessRole)}
                  disabled={activeSiteRole !== 'owner'}
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary"
                >
                  <option value="owner">Couple owner</option>
                  <option value="planner">Planner</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="viewer">Read only</option>
                </select>
                {activeSiteRole !== 'owner' && (
                  <p className="mt-1 text-[11px] text-text-tertiary">Access view follows your actual collaborator role on this site.</p>
                )}
              </div>
            </div>
          }
        >
          <div className="inline-flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
            <span className="rounded-lg border border-border bg-white px-3 py-1">Email drafts</span>
            <span className="rounded-lg border border-border bg-white px-3 py-1">Text drafts locked until setup</span>
            <span className="rounded-lg border border-border bg-white px-3 py-1">Editable before send</span>
          </div>
        </DashboardPageHero>

        {messagesRole === 'planner' && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Planner view</p>
            <p className="mt-3 font-semibold text-primary">Guest communications stay in focus here.</p>
            <p className="mt-2 leading-6 text-primary/80">This view stays centered on reminders, logistics updates, and the day-of notes guests actually need.</p>
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_320px]">
          <article className="rounded-[20px] border border-border bg-white p-5 shadow-none">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Message hub</p>
                <h2 className="mt-3 font-serif text-2xl font-normal text-text-primary">Draft, schedule, and review guest updates.</h2>
                <p className="mt-2 text-sm leading-6 text-text-secondary">Keep reminders, travel notes, RSVP nudges, and photo links together without turning the wedding into a group chat.</p>
              </div>
              <Button variant="primary" size="sm" onClick={() => startingPointsProps.onApplyComposerTemplate('blank')}>
                New update
              </Button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-surface-subtle/30 p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-tertiary">Last update</p>
                <p className="mt-2 text-sm font-semibold text-text-primary">{guestsReached > 0 ? `${guestsReached} reached` : 'Nothing sent yet'}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-subtle/30 p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-tertiary">Drafts</p>
                <p className="mt-2 text-sm font-semibold text-text-primary">{historyProps.messages.filter((message) => message.status === 'draft').length} waiting</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-subtle/30 p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-tertiary">Scheduled</p>
                <p className="mt-2 text-sm font-semibold text-text-primary">{scheduledCount > 0 ? `${scheduledCount} planned` : 'Ready when needed'}</p>
              </div>
            </div>
          </article>

          <aside className="rounded-[20px] border border-border bg-white p-5 shadow-none">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Starting points</p>
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => reachSnapshotProps.onApplyComposerTemplate('rsvp-reminder', { campaignName: 'RSVP reminder' })}
                className="w-full rounded-xl border border-border bg-surface-subtle/30 p-4 text-left transition-colors hover:border-primary/40 hover:bg-white"
              >
                <p className="text-sm font-semibold text-text-primary">RSVP reminder</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">Reach guests who have not replied without rebuilding the message from scratch.</p>
                <p className="mt-4 text-sm font-semibold text-primary">Use template</p>
              </button>
              <button
                type="button"
                onClick={() => reachSnapshotProps.onApplyComposerTemplate('event-reminder', { campaignName: 'Hotel update' })}
                className="w-full rounded-xl border border-border bg-surface-subtle/30 p-4 text-left transition-colors hover:border-primary/40 hover:bg-white"
              >
                <p className="text-sm font-semibold text-text-primary">Hotel or travel update</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">Share room block deadlines, parking notes, or arrival changes in one calm note.</p>
                <p className="mt-4 text-sm font-semibold text-primary">Use template</p>
              </button>
              <button
                type="button"
                onClick={reachSnapshotProps.onNavigatePhotos}
                className="w-full rounded-xl border border-border bg-surface-subtle/30 p-4 text-left transition-colors hover:border-primary/40 hover:bg-white"
              >
                <p className="text-sm font-semibold text-text-primary">Photo upload link</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">Send guests one clear photo or memory link before or after the celebration.</p>
                <p className="mt-4 text-sm font-semibold text-primary">Open photos</p>
              </button>
            </div>
          </aside>
        </section>

        <MessageGuestFlowCard />

        <section className="rounded-[20px] border border-border bg-white p-5 shadow-none">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Delivery details</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">Open the deeper send and delivery panels only when you want the operational view.</p>
            </div>
            <button
              type="button"
              onClick={toggleSendingDetails}
              className="inline-flex min-h-[44px] items-center rounded-lg border border-border bg-white px-4 text-sm font-medium text-text-secondary transition hover:border-primary/40 hover:text-primary"
            >
              {showSendingDetails ? 'Hide sending details' : 'Show sending details'}
            </button>
          </div>
        </section>

        {showSendingDetails && <MessageSendingDetailsPanel {...sendingDetailsProps} />}

        <section className="rounded-[20px] border border-border bg-white p-5 shadow-none">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Message workspace</p>
              <h2 className="mt-3 text-lg font-semibold text-text-primary">Build the note, then check the reach details only when you need them.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                The main composer stays on the left, while templates, reach context, and send details stay close without taking over the page.
              </p>
            </div>
            <div className="inline-flex flex-wrap gap-2 text-xs text-text-tertiary">
              <span className="rounded-lg border border-border bg-surface-subtle/30 px-3 py-1">Draft first</span>
              <span className="rounded-lg border border-border bg-surface-subtle/30 px-3 py-1">Schedule when ready</span>
              <span className="rounded-lg border border-border bg-surface-subtle/30 px-3 py-1">Templates stay close</span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <MessageComposerCard {...composerProps} />
            <MessageSavedTemplatesCard {...savedTemplatesProps} />
          </div>

          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 self-start">
            {showSendingDetails && <MessageReachSnapshotCard {...reachSnapshotProps} />}
            <MessageStartingPointsCard {...startingPointsProps} />
          </div>
        </div>

        <section className="space-y-4">
          <div className="rounded-[20px] border border-border bg-white p-5 shadow-none">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Recent message history</p>
            <h2 className="mt-3 text-lg font-semibold text-text-primary">Keep a clear record of what guests have already received.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              This is the audit trail for drafts, scheduled sends, and completed updates, so you can review timing before you send the next note.
            </p>
          </div>
          <MessageHistoryCard {...historyProps} />
        </section>
      </div>

      {detailModalProps && <MessageDetailModal {...detailModalProps} />}

      <ToastList toasts={toasts} />
    </DashboardLayout>
  );
}
