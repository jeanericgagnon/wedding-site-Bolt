import { useEffect, useRef, useState } from 'react';
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

type CopyActionResult = 'copied' | 'downloaded';

export interface GuestOpsSummaryPanelProps {
  canEditGuests: boolean;
  cleanGuestsView: boolean;
  contactCoverage: number;
  fromQuickStart: boolean;
  nextStep: string | null;
  opsQueue: OpsQueueItem[];
  plannerHandoff: PlannerHandoff;
  pendingCount: number;
  recommendedAction: RecommendedAction;
  totalCount: number;
  onAddGuest: () => void;
  onAddFollowUpTask: (text: string) => void;
  onCopyAddressCollectionLink: () => Promise<CopyActionResult | null>;
  onFocusQueueItem: (filter: string, guestName: string) => void;
  onFocusRecommendedAction: (filter: string) => void;
  onOpenRsvpSettings: () => void;
  onSkipToPhotos: () => void;
}

export function GuestOpsSummaryPanel({
  canEditGuests,
  cleanGuestsView,
  contactCoverage,
  fromQuickStart,
  nextStep,
  opsQueue,
  plannerHandoff,
  pendingCount,
  recommendedAction,
  totalCount,
  onAddGuest,
  onAddFollowUpTask,
  onCopyAddressCollectionLink,
  onFocusQueueItem,
  onFocusRecommendedAction,
  onOpenRsvpSettings,
  onSkipToPhotos,
}: GuestOpsSummaryPanelProps) {
  const [addressCollectionCopyNotice, setAddressCollectionCopyNotice] = useState<CopyActionResult | null>(null);
  const [copyingAddressCollectionLink, setCopyingAddressCollectionLink] = useState(false);
  const copyActionRequestIdRef = useRef(0);
  const copyActionRef = useRef(onCopyAddressCollectionLink);
  const mountedRef = useRef(true);
  const missingContactCount = totalCount > 0
    ? Math.max(0, totalCount - Math.round((contactCoverage / 100) * totalCount))
    : 0;

  copyActionRef.current = onCopyAddressCollectionLink;

  useEffect(() => () => {
    mountedRef.current = false;
    copyActionRequestIdRef.current += 1;
  }, []);

  useEffect(() => {
    copyActionRequestIdRef.current += 1;
    setAddressCollectionCopyNotice(null);
    setCopyingAddressCollectionLink(false);
  }, [onCopyAddressCollectionLink]);

  const handleCopyAddressCollectionLink = async () => {
    const requestId = ++copyActionRequestIdRef.current;
    const requestCopyAction = onCopyAddressCollectionLink;
    const isCurrentCopyAction = () => (
      mountedRef.current &&
      requestId === copyActionRequestIdRef.current &&
      requestCopyAction === copyActionRef.current
    );

    setAddressCollectionCopyNotice(null);
    setCopyingAddressCollectionLink(true);
    try {
      const result = await requestCopyAction();
      if (result && isCurrentCopyAction()) {
        setAddressCollectionCopyNotice(result);
      }
    } finally {
      if (isCurrentCopyAction()) {
        setCopyingAddressCollectionLink(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-[20px] border border-border-subtle bg-white p-5 shadow-none">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Add guests one by one.</h3>
            <p className="mt-2 text-sm leading-6 text-text-secondary">Start with the people you know are invited, then let the list grow around them.</p>
          </div>
          <Button
            variant="outline"
            size="md"
            className="mt-5"
            onClick={onAddGuest}
            disabled={!canEditGuests}
          >
            Add guest
          </Button>
        </article>

        <article className="rounded-[20px] border border-border-subtle bg-white p-5 shadow-none">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Review replies and RSVP setup.</h3>
            <p className="mt-2 text-sm leading-6 text-text-secondary">Keep private links, event invites, meals, and follow-up logic easy to manage from one place.</p>
          </div>
          <Button variant="outline" size="md" className="mt-5" onClick={onOpenRsvpSettings}>
            Review RSVPs
          </Button>
        </article>

        <article className="rounded-[20px] border border-border-subtle bg-white p-5 shadow-none">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Collect missing contact details.</h3>
            <p className="mt-2 text-sm leading-6 text-text-secondary">Send one private link so guests can fill in addresses, phone numbers, and language details themselves.</p>
          </div>
          <Button variant="outline" size="md" className="mt-5" disabled={copyingAddressCollectionLink} onClick={() => { void handleCopyAddressCollectionLink(); }}>
            {copyingAddressCollectionLink
              ? 'Copying link...'
              : addressCollectionCopyNotice === 'copied'
                ? 'Copied guest contact link'
                : addressCollectionCopyNotice === 'downloaded'
                  ? 'Downloaded guest contact link'
                  : 'Copy link'}
          </Button>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_360px]">
        <Card variant="bordered" padding="lg">
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Guest records</p>
              <h2 className="mt-3 font-serif text-2xl font-normal text-text-primary">Everything has a place.</h2>
            </div>
            <div className="space-y-3">
              <div className="rounded-[20px] border border-border-subtle bg-surface-subtle/30 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Guest list</h3>
                    <p className="mt-1 text-sm leading-6 text-text-secondary">Search, filters, households, plus-ones, language, notes, and guest view all stay together.</p>
                  </div>
                  <span className="text-sm font-semibold text-text-primary">{totalCount} invited</span>
                </div>
              </div>
              <div className="rounded-[20px] border border-border-subtle bg-surface-subtle/30 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">RSVPs</h3>
                    <p className="mt-1 text-sm leading-6 text-text-secondary">Private links, name lookup backup, event invites, meals, custom questions, and response cleanup.</p>
                  </div>
                  <span className="text-sm font-semibold text-text-primary">{Math.max(0, totalCount - pendingCount)} replied</span>
                </div>
              </div>
              <div className="rounded-[20px] border border-border-subtle bg-surface-subtle/30 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Follow-up</h3>
                    <p className="mt-1 text-sm leading-6 text-text-secondary">Address links, reminders, selected sends, no-contact lists, and recipient preview stay close.</p>
                  </div>
                  <span className="text-sm font-semibold text-text-primary">{pendingCount} pending</span>
                </div>
              </div>
              <div className="rounded-[20px] border border-border-subtle bg-surface-subtle/30 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Contact details</h3>
                    <p className="mt-1 text-sm leading-6 text-text-secondary">Private guest update links keep mailing addresses, phone numbers, and language preferences current.</p>
                  </div>
                  <span className="text-sm font-semibold text-text-primary">{missingContactCount} missing</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card variant="bordered" padding="lg">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Needs review</p>
            {recommendedAction && (
              <button
                type="button"
                onClick={() => onFocusRecommendedAction(recommendedAction.filter)}
                className="w-full rounded-[20px] border border-primary/20 bg-primary/5 p-4 text-left transition hover:border-primary/35"
              >
                <p className="text-sm font-semibold text-text-primary">{recommendedAction.title}</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{recommendedAction.detail}</p>
                <p className="mt-4 text-sm font-semibold text-primary">Focus now</p>
              </button>
            )}

            {opsQueue.slice(0, 3).map((item, index) => (
              <button
                key={`${item.guestId}-${index}`}
                onClick={() => onFocusQueueItem(item.filter, item.guestName)}
                className="w-full rounded-[20px] border border-border-subtle bg-white p-4 text-left transition hover:border-primary/30 hover:shadow-none"
              >
                <p className="text-sm font-semibold text-text-primary">{item.guestName}</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{item.issue}</p>
                <p className="mt-4 text-sm font-semibold text-primary">Open guest</p>
              </button>
            ))}

            {!recommendedAction && opsQueue.length === 0 && (
              <div className="rounded-[20px] border border-border-subtle bg-surface-subtle/30 p-4">
                <p className="text-sm font-semibold text-text-primary">Nothing urgent is waiting.</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">Guest cleanup is in a calm place right now. The deeper controls stay just below.</p>
              </div>
            )}
          </div>
        </Card>
      </section>

      <Card variant="bordered" padding="lg">
        <div className="space-y-6">
        {!cleanGuestsView && recommendedAction && (
          <div className="flex flex-col gap-3 rounded-[20px] border border-primary/20 bg-primary/5 p-3.5 sm:flex-row sm:items-center sm:justify-between">
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
                disabled={!canEditGuests}
              >
                Save task
              </Button>
            </div>
          </div>
        )}

        {!cleanGuestsView && opsQueue.length > 0 && (
          <div className="space-y-2 rounded-[20px] border border-border-subtle bg-white p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-text-primary">RSVP follow-up list</p>
              <span className="text-xs text-text-tertiary break-words">{opsQueue.length} to review</span>
            </div>
            <div className="space-y-1.5">
              {opsQueue.map((item, index) => (
                <button
                  key={`${item.guestId}-${index}`}
                  onClick={() => onFocusQueueItem(item.filter, item.guestName)}
                  className="w-full rounded-xl border border-border px-2.5 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <p className="text-xs font-semibold text-text-primary">{item.guestName}</p>
                  <p className="text-[11px] text-text-tertiary">{item.issue}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-[20px] border border-primary/20 bg-primary/5 p-4 text-sm shadow-none">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Planner handoff</p>
          <p className="mt-3 font-semibold text-primary">{plannerHandoff.title}</p>
          <p className="mt-2 leading-6 text-primary/80">{plannerHandoff.detail}</p>
          <p className="mt-3 text-xs text-primary/70">Use this surface to move guest work forward, but couple approval still matters for sensitive calls.</p>
        </div>

        {fromQuickStart && nextStep === 'photos' && (
          <div className="rounded-[20px] border border-primary/20 bg-primary/5 p-4 shadow-none">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Quick start</p>
                <p className="mt-3 text-sm font-semibold text-text-primary">Next up: import guests, then add photos</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">Import your guest list here. If you want to skip this for now, jump straight to photos and come back later.</p>
              </div>
              <Button variant="outline" size="sm" onClick={onSkipToPhotos}>
                Skip to photos
              </Button>
            </div>
          </div>
        )}
        </div>
      </Card>
    </div>
  );
}
