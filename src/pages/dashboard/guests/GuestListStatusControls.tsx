import React from 'react';
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
        <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
                onClick={() => onFocusOpsItem(item.filter, item.guestName)}
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

      <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border-subtle bg-surface-subtle">
        <p className="text-xs text-text-secondary">
          Active segment: <span className="font-semibold text-text-primary">{segmentLabel}</span>
          {extraFilterCount > 0 ? <> · +<span className="font-semibold text-text-primary">{extraFilterCount}</span> filters</> : null}
          {searchQuery ? <> · Search: <span className="font-semibold text-text-primary">“{searchQuery}”</span></> : null}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onClearFilters}
            className="text-xs px-2 py-1 rounded-md border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary"
          >
            Clear filters
          </button>
        </div>
      </div>

      {exceptionReviewVisible && (
        <div className="p-2.5 rounded-lg border border-border-subtle bg-surface-subtle/60 text-text-secondary text-xs space-y-2">
          <p>Some guests have RSVP details that are worth reviewing personally.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={onCopyExceptionChecklist} className="px-2 py-1 rounded-md border border-border-subtle bg-white text-text-secondary hover:bg-surface-subtle">Copy exception checklist</button>
          </div>
        </div>
      )}

      {filterStatus === 'missing-meal' && (
        <div className="p-2.5 rounded-lg border border-border-subtle bg-surface-subtle/60 text-text-secondary text-xs space-y-2">
          <p>These guests are attending but still need a meal choice.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={onCopyMissingMealChecklist} className="px-2 py-1 rounded-md border border-border-subtle bg-white text-text-secondary hover:bg-surface-subtle">Copy meal follow-up checklist</button>
            <button onClick={onOpenCampaignModal} className="px-2 py-1 rounded-md border border-border-subtle bg-white text-text-secondary hover:bg-surface-subtle">Send follow-up</button>
          </div>
        </div>
      )}

      {filterStatus === 'no-contact' && (
        <div className="p-2.5 rounded-lg border border-border-subtle bg-surface-subtle/60 text-text-secondary text-xs space-y-2">
          <p>These guests have no email or phone. Add contact info before reminder campaigns.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={onCopyNoContactChecklist} className="px-2 py-1 rounded-md border border-border-subtle bg-white text-text-secondary hover:bg-surface-subtle">Copy follow-up checklist</button>
            <button onClick={onCopyContactRequestLink} className="px-2 py-1 rounded-md border border-border-subtle bg-white text-text-secondary hover:bg-surface-subtle">Copy guest update link</button>
          </div>
        </div>
      )}

      <div className="sticky top-2 z-10 flex gap-2 flex-wrap items-start justify-between bg-white/95 backdrop-blur p-2.5 rounded-lg border border-border/50">
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
                className={`text-xs px-3.5 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
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
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border whitespace-nowrap shrink-0 ${
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
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border whitespace-nowrap shrink-0 ${
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
        <div className="mb-3 flex items-center justify-between px-4 py-2.5 bg-success/10 border border-success/25 rounded-lg">
          <span className="text-sm font-medium text-success">Check-in mode active · {checkInCount} checked in</span>
          <button
            onClick={onViewCheckedIn}
            className="text-xs px-2 py-1 rounded-md border border-success/30 bg-white text-success hover:bg-success/5"
          >
            View checked-in
          </button>
        </div>
      )}

      {checkInMode && lastCheckInGuestName && (
        <div className="mb-3 flex items-center justify-between px-4 py-2 bg-surface-subtle border border-border rounded-lg">
          <span className="text-xs text-text-secondary">Last check-in: <span className="font-medium text-text-primary">{lastCheckInGuestName}</span></span>
          <button
            onClick={onUndoLastCheckIn}
            className="text-xs px-2 py-1 rounded-md border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary"
          >
            Undo
          </button>
        </div>
      )}

      {selectedGuestCount > 0 && viewMode === 'list' && (
        <div className="mb-3 flex items-center justify-between px-4 py-2 bg-primary/8 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium text-primary">{selectedGuestCount} selected · {visibleSelectedCount} visible</span>
          <div className="flex items-center gap-2">
            <button onClick={onKeepVisibleSelection} className="text-xs px-2 py-1 rounded-md border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Keep visible only</button>
            <button onClick={onClearGuestSelection} className="text-xs px-2 py-1 rounded-md border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Clear</button>
          </div>
        </div>
      )}
    </>
  );
}
