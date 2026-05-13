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
} from './MessageDashboardComponents';
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
      <div className="max-w-[1100px] mx-auto space-y-5">
        <DashboardPageHero
          eyebrow="Messages"
          title="Send guest updates without making them feel automated."
          description="Pick the moment, confirm the audience, edit the words, and choose when it should go out. Text sending stays locked until setup is ready."
          stats={[
            { label: 'Scheduled', value: scheduledCount, detail: 'waiting to send' },
            { label: 'Guests reached', value: guestsReached, detail: 'across sent updates' },
            { label: 'Delivery', value: `${deliveryRate}%`, detail: 'latest delivery health' },
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
                  : <><Clock className="w-4 h-4 mr-2" />{overdueScheduled > 0 ? `Run ${overdueScheduled} due scheduled send${overdueScheduled !== 1 ? 's' : ''}` : 'Run due scheduled sends'}</>}
              </Button>
              <div>
                <label className="block text-xs text-text-tertiary mb-1">View as</label>
                <select
                  value={messagesRole}
                  onChange={(e) => onSetMessagesRole(e.target.value as PlannerAccessRole)}
                  disabled={activeSiteRole !== 'owner'}
                  className="px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary"
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
            <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">Email drafts</span>
            <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">Text drafts locked until setup</span>
            <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">Editable before send</span>
          </div>
        </DashboardPageHero>

        {messagesRole === 'planner' && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            Planner view is on. This view stays focused on guest communications, reminders, and day-of updates.
          </div>
        )}

        <MessageGuestFlowCard />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={toggleSendingDetails}
            className="inline-flex items-center rounded-lg border border-border-subtle bg-white px-4 py-2 text-sm font-medium text-text-secondary transition hover:border-primary/30 hover:text-primary"
          >
            {showSendingDetails ? 'Hide sending details' : 'Show sending details'}
          </button>
        </div>

        {showSendingDetails && <MessageSendingDetailsPanel {...sendingDetailsProps} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <MessageComposerCard {...composerProps} />
            <MessageSavedTemplatesCard {...savedTemplatesProps} />
          </div>

          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 self-start">
            {showSendingDetails && <MessageReachSnapshotCard {...reachSnapshotProps} />}
            <MessageStartingPointsCard {...startingPointsProps} />
          </div>
        </div>

        <MessageHistoryCard {...historyProps} />
      </div>

      {detailModalProps && <MessageDetailModal {...detailModalProps} />}

      <ToastList toasts={toasts} />
    </DashboardLayout>
  );
}
