import { Button, Card } from '../../../components/ui';

type RecommendedAction = {
  detail: string;
  filter: string;
  title: string;
} | null;

type OpsQueueItem = {
  filter: string;
  guestId: string;
  guestName: string;
  issue: string;
};

type PlannerHandoff = {
  detail: string;
  title: string;
};

export interface GuestOpsSummaryPanelProps {
  cleanGuestsView: boolean;
  fromQuickStart: boolean;
  nextStep: string | null;
  opsQueue: OpsQueueItem[];
  plannerHandoff: PlannerHandoff;
  recommendedAction: RecommendedAction;
  onAddFollowUpTask: (text: string) => void;
  onFocusQueueItem: (filter: string, guestName: string) => void;
  onFocusRecommendedAction: (filter: string) => void;
  onSkipToPhotos: () => void;
}

export function GuestOpsSummaryPanel({
  cleanGuestsView,
  fromQuickStart,
  nextStep,
  opsQueue,
  plannerHandoff,
  recommendedAction,
  onAddFollowUpTask,
  onFocusQueueItem,
  onFocusRecommendedAction,
  onSkipToPhotos,
}: GuestOpsSummaryPanelProps) {
  return (
    <Card variant="bordered" padding="lg">
      <div className="space-y-6">
        {!cleanGuestsView && recommendedAction && (
          <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text-primary">Recommended next action: {recommendedAction.title}</p>
              <p className="text-xs text-text-secondary mt-0.5">{recommendedAction.detail}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFocusRecommendedAction(recommendedAction.filter)}
              >
                Focus now
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAddFollowUpTask(recommendedAction.title)}
              >
                Save task
              </Button>
            </div>
          </div>
        )}

        {!cleanGuestsView && opsQueue.length > 0 && (
          <div className="p-3.5 rounded-lg border border-border-subtle bg-white space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-text-primary">RSVP follow-up list</p>
              <span className="text-xs text-text-tertiary break-words">{opsQueue.length} to review</span>
            </div>
            <div className="space-y-1.5">
              {opsQueue.map((item, index) => (
                <button
                  key={`${item.guestId}-${index}`}
                  onClick={() => onFocusQueueItem(item.filter, item.guestName)}
                  className="w-full text-left px-2.5 py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  <p className="text-xs font-semibold text-text-primary">{item.guestName}</p>
                  <p className="text-[11px] text-text-tertiary">{item.issue}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
          <p className="font-medium text-primary">{plannerHandoff.title}</p>
          <p className="mt-1 text-primary/80">{plannerHandoff.detail}</p>
          <p className="mt-2 text-primary/70">Use this surface to move guest work forward, but couple approval still matters for sensitive calls.</p>
        </div>

        {fromQuickStart && nextStep === 'photos' && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text-primary">Next up: import guests, then add photos</p>
              <p className="text-xs text-text-secondary mt-1">Import your guest list here. If you want to skip this for now, jump straight to photos and come back later.</p>
            </div>
            <Button variant="outline" size="sm" onClick={onSkipToPhotos}>
              Skip to photos
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
