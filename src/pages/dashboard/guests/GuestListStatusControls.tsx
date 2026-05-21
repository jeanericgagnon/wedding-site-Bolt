import { CheckCircle2, Home } from 'lucide-react';
import { Button } from '../../../components/ui';
import type { GuestOpsQueueItem, GuestRecommendedAction } from './guestDashboardUtils';

export type GuestFilterStatus =
  | 'all'
  | 'confirmed'
  | 'declined'
  | 'pending'
  | 'checked-in'
  | 'thank-you-due'
  | 'due-reminder'
  | 'missing-address'
  | 'ceremony-no'
  | 'reception-no'
  | 'missing-meal'
  | 'plusone-missing'
  | 'pending-no-email'
  | 'manual-follow-up'
  | 'manual-handled'
  | 'no-contact';

export interface GuestListStats {
  total: number;
  confirmed: number;
  declined: number;
  pending: number;
}

interface GuestListStatusControlsProps {
  canEditGuests: boolean;
  checkInCount: number;
  checkInMode: boolean;
  cleanGuestsView: boolean;
  exceptionReviewVisible: boolean;
  extraFilterCount: number;
  fromQuickStart: boolean;
  filterStatus: GuestFilterStatus;
  lastCheckInGuestName: string | null;
  nextStep: string | null;
  opsQueue: GuestOpsQueueItem[];
  plannerHandoff: { title: string; detail: string };
  recommendedAction: GuestRecommendedAction | null;
  searchQuery: string;
  selectedGuestCount: number;
  segmentLabel: string;
  stats: GuestListStats;
  viewMode: 'list' | 'households';
  visibleSelectedCount: number;
  onClearFilters: () => void;
  onClearGuestSelection: () => void;
  onCopyContactRequestLink: () => void;
  onCopyExceptionChecklist: () => void;
  onCopyMissingMealChecklist: () => void;
  onCopyNoContactChecklist: () => void;
  onFocusRecommended: (filter: GuestRecommendedAction['filter']) => void;
  onFocusOpsItem: (filter: GuestOpsQueueItem['filter'], guestName: string) => void;
  onKeepVisibleSelection: () => void;
  onOpenCampaignModal: () => void;
  onSaveRecommendedTask: (title: string) => void;
  onSelectSegment: (filter: 'all' | 'confirmed' | 'declined' | 'pending') => void;
  onSkipToPhotos: () => void;
  onToggleCheckInMode: () => void;
  onToggleHouseholds: () => void;
  onUndoLastCheckIn: () => void;
  onViewCheckedIn: () => void;
}

export function GuestListStatusControls({
  canEditGuests,
  checkInCount,
  checkInMode,
  cleanGuestsView,
  exceptionReviewVisible,
  extraFilterCount,
  filterStatus,
  fromQuickStart,
  lastCheckInGuestName,
  nextStep,
  opsQueue,
  plannerHandoff,
  recommendedAction,
  searchQuery,
  selectedGuestCount,
  segmentLabel,
  stats,
  viewMode,
  visibleSelectedCount,
  onClearFilters,
  onClearGuestSelection,
  onCopyContactRequestLink,
  onCopyExceptionChecklist,
  onCopyMissingMealChecklist,
  onCopyNoContactChecklist,
  onFocusOpsItem,
  onFocusRecommended,
  onKeepVisibleSelection,
  onOpenCampaignModal,
  onSaveRecommendedTask,
  onSelectSegment,
  onSkipToPhotos,
  onToggleCheckInMode,
  onToggleHouseholds,
  onUndoLastCheckIn,
  onViewCheckedIn,
}: GuestListStatusControlsProps) {
  return (
    <>
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
              onClick={() => onFocusRecommended(recommendedAction.filter)}
            >
              Focus now
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSaveRecommendedTask(recommendedAction.title)}
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
                onClick={() => onFocusOpsItem(item.filter, item.guestName)}
                className="w-full rounded-[20px] border border-border px-2.5 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <p className="text-xs font-semibold text-text-primary">{item.guestName}</p>
                <p className="text-[11px] text-text-tertiary">{item.issue}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-[20px] border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
        <p className="font-medium text-primary">{plannerHandoff.title}</p>
        <p className="mt-1 text-primary/80">{plannerHandoff.detail}</p>
        <p className="mt-2 text-primary/70">Use this surface to move guest work forward, but couple approval still matters for sensitive calls.</p>
      </div>

      {fromQuickStart && nextStep === 'photos' && (
        <div className="flex flex-col gap-3 rounded-[20px] border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-text-primary">Next up: import guests, then add photos</p>
            <p className="text-xs text-text-secondary mt-1">Import your guest list here. If you want to skip this for now, jump straight to photos and come back later.</p>
          </div>
          <Button variant="outline" size="sm" onClick={onSkipToPhotos}>
            Skip to photos
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-[20px] border border-border-subtle bg-surface-subtle p-2.5">
        <p className="text-xs text-text-secondary">
          Active segment: <span className="font-semibold text-text-primary">{segmentLabel}</span>
          {extraFilterCount > 0 ? <> · +<span className="font-semibold text-text-primary">{extraFilterCount}</span> filters</> : null}
          {searchQuery ? <> · Search: <span className="font-semibold text-text-primary">“{searchQuery}”</span></> : null}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onClearFilters}
            className="text-xs rounded-xl border border-border bg-white px-2 py-1 text-text-secondary hover:border-primary/40 hover:text-primary"
          >
            Clear filters
          </button>
        </div>
      </div>

      {exceptionReviewVisible && (
        <div className="space-y-2 rounded-[20px] border border-border-subtle bg-surface-subtle/60 p-2.5 text-xs text-text-secondary">
          <p>Some guests have RSVP details that are worth reviewing personally.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={onCopyExceptionChecklist} className="rounded-xl border border-border-subtle bg-white px-2 py-1 text-text-secondary hover:bg-surface-subtle">Copy exception checklist</button>
          </div>
        </div>
      )}

      {filterStatus === 'missing-meal' && (
        <div className="space-y-2 rounded-[20px] border border-border-subtle bg-surface-subtle/60 p-2.5 text-xs text-text-secondary">
          <p>These guests are attending but still need a meal choice.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={onCopyMissingMealChecklist} className="rounded-xl border border-border-subtle bg-white px-2 py-1 text-text-secondary hover:bg-surface-subtle">Copy meal follow-up checklist</button>
            <button
              onClick={onOpenCampaignModal}
              disabled={!canEditGuests}
              className="rounded-xl border border-border-subtle bg-white px-2 py-1 text-text-secondary hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send follow-up
            </button>
          </div>
        </div>
      )}

      {filterStatus === 'no-contact' && (
        <div className="space-y-2 rounded-[20px] border border-border-subtle bg-surface-subtle/60 p-2.5 text-xs text-text-secondary">
          <p>These guests have no email or phone. Add contact info before reminder campaigns.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={onCopyNoContactChecklist} className="rounded-xl border border-border-subtle bg-white px-2 py-1 text-text-secondary hover:bg-surface-subtle">Copy follow-up checklist</button>
            <button onClick={onCopyContactRequestLink} className="rounded-xl border border-border-subtle bg-white px-2 py-1 text-text-secondary hover:bg-surface-subtle">Copy guest update link</button>
          </div>
        </div>
      )}

      <div className="sticky top-2 z-10 flex flex-wrap items-start justify-between gap-2 rounded-[20px] border border-border/50 bg-white/95 p-2.5 backdrop-blur">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {([
              ['all', `All (${stats.total})`],
              ['confirmed', `Confirmed (${stats.confirmed})`],
              ['declined', `Declined (${stats.declined})`],
              ['pending', `Pending (${stats.pending})`],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onSelectSegment(value)}
                className={`text-xs rounded-xl border px-3.5 py-1.5 whitespace-nowrap transition-colors ${
                  filterStatus === value
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-text-secondary border-border/70 hover:border-primary/35 hover:text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={onToggleHouseholds}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
            viewMode === 'households' && !checkInMode
              ? 'bg-primary text-text-inverse border-primary'
              : 'text-text-secondary border-border hover:border-primary hover:text-primary'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          Households
        </button>
        <button
          onClick={onToggleCheckInMode}
          disabled={!canEditGuests}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
            checkInMode
              ? 'bg-success text-white border-success'
              : 'text-text-secondary border-border hover:border-success/60 hover:text-success'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Check-in mode
        </button>
      </div>

      {checkInMode && (
        <div className="mb-3 flex items-center justify-between rounded-[20px] border border-success/25 bg-success/10 px-4 py-2.5">
          <span className="text-sm font-medium text-success">Check-in mode active · {checkInCount} checked in</span>
          <button
            onClick={onViewCheckedIn}
            className="text-xs rounded-xl border border-success/30 bg-white px-2 py-1 text-success hover:bg-success/5"
          >
            View checked-in
          </button>
        </div>
      )}

      {checkInMode && lastCheckInGuestName && (
        <div className="mb-3 flex items-center justify-between rounded-[20px] border border-border bg-surface-subtle px-4 py-2">
          <span className="text-xs text-text-secondary">Last check-in: <span className="font-medium text-text-primary">{lastCheckInGuestName}</span></span>
          <button
            onClick={onUndoLastCheckIn}
            disabled={!canEditGuests}
            className="text-xs rounded-xl border border-border bg-white px-2 py-1 text-text-secondary hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Undo
          </button>
        </div>
      )}

      {selectedGuestCount > 0 && viewMode === 'list' && (
        <div className="mb-3 flex items-center justify-between rounded-[20px] border border-primary/20 bg-primary/8 px-4 py-2">
          <span className="text-sm font-medium text-primary">{selectedGuestCount} selected · {visibleSelectedCount} visible</span>
          <div className="flex items-center gap-2">
            <button onClick={onKeepVisibleSelection} disabled={!canEditGuests} className="text-xs rounded-xl border border-border bg-white px-2 py-1 text-text-secondary hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60">Keep visible only</button>
            <button onClick={onClearGuestSelection} className="text-xs rounded-xl border border-border bg-white px-2 py-1 text-text-secondary hover:border-primary/40 hover:text-primary">Clear</button>
          </div>
        </div>
      )}
    </>
  );
}
