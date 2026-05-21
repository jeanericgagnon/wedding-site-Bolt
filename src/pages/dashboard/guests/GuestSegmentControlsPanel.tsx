import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Home } from 'lucide-react';

export interface GuestSegmentOption {
  label: string;
  value: string;
}

export interface GuestSegmentControlsPanelProps {
  activeSegmentLabel: string;
  canEditGuests: boolean;
  checkInMode: boolean;
  checkedInCount: number;
  extraFilterCount: number;
  filterStatus: string;
  lastCheckInGuestName: string | null;
  searchQuery: string;
  segmentOptions: GuestSegmentOption[];
  selectedGuestCount: number;
  showExceptionBanner: boolean;
  showMissingMealBanner: boolean;
  showNoContactBanner: boolean;
  viewMode: 'list' | 'households';
  visibleSelectedCount: number;
  onClearFilters: () => void;
  onClearSelection: () => void;
  onCopyContactRequestLink: () => Promise<'copied' | 'downloaded' | null>;
  onCopyExceptionChecklist: () => Promise<'copied' | 'downloaded' | null>;
  onCopyMissingMealChecklist: () => Promise<'copied' | 'downloaded' | null>;
  onCopyNoContactChecklist: () => Promise<'copied' | 'downloaded' | null>;
  onKeepOnlyVisibleSelection: () => void;
  onOpenCampaignModal: () => void;
  onSelectCheckedInFilter: () => void;
  onSelectPrimaryFilter: (value: string) => void;
  onToggleCheckInMode: () => void;
  onToggleHouseholdsView: () => void;
  onUndoLastCheckIn: () => void;
}

export function GuestSegmentControlsPanel({
  activeSegmentLabel,
  canEditGuests,
  checkInMode,
  checkedInCount,
  extraFilterCount,
  filterStatus,
  lastCheckInGuestName,
  searchQuery,
  segmentOptions,
  selectedGuestCount,
  showExceptionBanner,
  showMissingMealBanner,
  showNoContactBanner,
  viewMode,
  visibleSelectedCount,
  onClearFilters,
  onClearSelection,
  onCopyContactRequestLink,
  onCopyExceptionChecklist,
  onCopyMissingMealChecklist,
  onCopyNoContactChecklist,
  onKeepOnlyVisibleSelection,
  onOpenCampaignModal,
  onSelectCheckedInFilter,
  onSelectPrimaryFilter,
  onToggleCheckInMode,
  onToggleHouseholdsView,
  onUndoLastCheckIn,
}: GuestSegmentControlsPanelProps) {
  const [copyNotice, setCopyNotice] = useState<{
    key: 'contact' | 'exception' | 'meal' | 'no-contact';
    mode: 'copied' | 'downloaded';
  } | null>(null);
  const [copyingKey, setCopyingKey] = useState<'contact' | 'exception' | 'meal' | 'no-contact' | null>(null);
  const copyActionRequestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const copyContextKey = useMemo(
    () => [
      activeSegmentLabel,
      filterStatus,
      searchQuery,
      showExceptionBanner,
      showMissingMealBanner,
      showNoContactBanner,
    ].join('|'),
    [activeSegmentLabel, filterStatus, searchQuery, showExceptionBanner, showMissingMealBanner, showNoContactBanner],
  );
  const copyContextKeyRef = useRef(copyContextKey);

  copyContextKeyRef.current = copyContextKey;

  useEffect(() => () => {
    mountedRef.current = false;
    copyActionRequestIdRef.current += 1;
  }, []);

  useEffect(() => {
    copyActionRequestIdRef.current += 1;
    setCopyNotice(null);
    setCopyingKey(null);
  }, [copyContextKey]);

  const runCopyAction = async (
    key: 'contact' | 'exception' | 'meal' | 'no-contact',
    action: () => Promise<'copied' | 'downloaded' | null>,
  ) => {
    const requestId = ++copyActionRequestIdRef.current;
    const requestContextKey = copyContextKeyRef.current;
    const isCurrentCopyAction = () => (
      mountedRef.current &&
      requestId === copyActionRequestIdRef.current &&
      requestContextKey === copyContextKeyRef.current
    );

    setCopyNotice(null);
    setCopyingKey(key);
    try {
      const result = await action();
      if (result && isCurrentCopyAction()) {
        setCopyNotice({ key, mode: result });
      }
    } finally {
      if (isCurrentCopyAction()) {
        setCopyingKey((current) => (current === key ? null : current));
      }
    }
  };

  return (
    <>
      <div className="rounded-[20px] border border-border-subtle bg-white p-4 shadow-none">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Filters and views</p>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Active segment: <span className="font-semibold text-text-primary">{activeSegmentLabel}</span>
              {extraFilterCount > 0 ? <> · +<span className="font-semibold text-text-primary">{extraFilterCount}</span> filters</> : null}
              {searchQuery ? <> · Search: <span className="font-semibold text-text-primary">“{searchQuery}”</span></> : null}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClearFilters}
              className="text-xs px-2 py-1 rounded-xl border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary"
            >
              Clear filters
            </button>
          </div>
        </div>
      </div>

      {showExceptionBanner && (
        <div className="rounded-[20px] border border-border-subtle bg-surface-subtle/30 p-4 text-text-secondary text-sm shadow-none space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Worth reviewing</p>
          <p className="leading-6">Some guests have RSVP details that are worth reviewing personally.</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { void runCopyAction('exception', onCopyExceptionChecklist); }}
              disabled={copyingKey === 'exception'}
              className="px-2 py-1 rounded-xl border border-border-subtle bg-white text-text-secondary hover:bg-surface-subtle disabled:opacity-60"
            >
              {copyingKey === 'exception'
                ? 'Copying exception checklist...'
                : copyNotice?.key === 'exception'
                  ? copyNotice.mode === 'downloaded'
                    ? 'Downloaded exception checklist'
                    : 'Copied exception checklist'
                  : 'Copy exception checklist'}
            </button>
          </div>
        </div>
      )}

      {showMissingMealBanner && (
        <div className="rounded-[20px] border border-border-subtle bg-surface-subtle/30 p-4 text-text-secondary text-sm shadow-none space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Meal follow-up</p>
          <p className="leading-6">These guests are attending but still need a meal choice.</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { void runCopyAction('meal', onCopyMissingMealChecklist); }}
              disabled={copyingKey === 'meal'}
              className="px-2 py-1 rounded-xl border border-border-subtle bg-white text-text-secondary hover:bg-surface-subtle disabled:opacity-60"
            >
              {copyingKey === 'meal'
                ? 'Copying meal follow-up checklist...'
                : copyNotice?.key === 'meal'
                  ? copyNotice.mode === 'downloaded'
                    ? 'Downloaded meal follow-up checklist'
                    : 'Copied meal follow-up checklist'
                  : 'Copy meal follow-up checklist'}
            </button>
            <button
              onClick={onOpenCampaignModal}
              disabled={!canEditGuests}
              className="px-2 py-1 rounded-xl border border-border-subtle bg-white text-text-secondary hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send follow-up
            </button>
          </div>
        </div>
      )}

      {showNoContactBanner && (
        <div className="rounded-[20px] border border-border-subtle bg-surface-subtle/30 p-4 text-text-secondary text-sm shadow-none space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Missing contact info</p>
          <p className="leading-6">These guests have no email or phone. Add contact info before reminder campaigns.</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { void runCopyAction('no-contact', onCopyNoContactChecklist); }}
              disabled={copyingKey === 'no-contact'}
              className="px-2 py-1 rounded-xl border border-border-subtle bg-white text-text-secondary hover:bg-surface-subtle disabled:opacity-60"
            >
              {copyingKey === 'no-contact'
                ? 'Copying follow-up checklist...'
                : copyNotice?.key === 'no-contact'
                  ? copyNotice.mode === 'downloaded'
                    ? 'Downloaded follow-up checklist'
                    : 'Copied follow-up checklist'
                  : 'Copy follow-up checklist'}
            </button>
            <button
              onClick={() => { void runCopyAction('contact', onCopyContactRequestLink); }}
              disabled={copyingKey === 'contact'}
              className="px-2 py-1 rounded-xl border border-border-subtle bg-white text-text-secondary hover:bg-surface-subtle disabled:opacity-60"
            >
              {copyingKey === 'contact'
                ? 'Copying guest update link...'
                : copyNotice?.key === 'contact'
                  ? copyNotice.mode === 'downloaded'
                    ? 'Downloaded guest update link'
                    : 'Copied guest update link'
                  : 'Copy guest update link'}
            </button>
          </div>
        </div>
      )}

      <div className="sticky top-2 z-10 flex gap-2 flex-wrap items-start justify-between bg-white/95 backdrop-blur p-2.5 rounded-[20px] border border-border/50 shadow-none">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {segmentOptions.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => onSelectPrimaryFilter(value)}
                className={`text-xs px-3.5 py-1.5 rounded-xl border transition-colors whitespace-nowrap ${
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
          onClick={onToggleHouseholdsView}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors border whitespace-nowrap shrink-0 ${
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
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors border whitespace-nowrap shrink-0 ${
            checkInMode
              ? 'bg-success text-white border-success'
              : 'text-text-secondary border-border hover:border-success/60 hover:text-success'
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Check-in mode
        </button>
      </div>

      {checkInMode && (
        <div className="mb-3 flex items-center justify-between px-4 py-2.5 bg-success/10 border border-success/25 rounded-[20px] shadow-none">
          <span className="text-sm font-medium text-success">Check-in mode active · {checkedInCount} checked in</span>
          <button
            onClick={onSelectCheckedInFilter}
            className="text-xs px-2 py-1 rounded-xl border border-success/30 bg-white text-success hover:bg-success/5"
          >
            View checked-in
          </button>
        </div>
      )}

      {checkInMode && lastCheckInGuestName && (
        <div className="mb-3 flex items-center justify-between px-4 py-2 bg-surface-subtle border border-border rounded-[20px] shadow-none">
          <span className="text-xs text-text-secondary">Last check-in: <span className="font-medium text-text-primary">{lastCheckInGuestName}</span></span>
          <button
            onClick={onUndoLastCheckIn}
            disabled={!canEditGuests}
            className="text-xs px-2 py-1 rounded-xl border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Undo
          </button>
        </div>
      )}

      {selectedGuestCount > 0 && viewMode === 'list' && (
        <div className="mb-3 flex items-center justify-between px-4 py-2 bg-primary/8 border border-primary/20 rounded-[20px] shadow-none">
          <span className="text-sm font-medium text-primary">{selectedGuestCount} selected · {visibleSelectedCount} visible</span>
          <div className="flex items-center gap-2">
            <button onClick={onKeepOnlyVisibleSelection} disabled={!canEditGuests} className="text-xs px-2 py-1 rounded-xl border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60">Keep visible only</button>
            <button onClick={onClearSelection} className="text-xs px-2 py-1 rounded-xl border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Clear</button>
          </div>
        </div>
      )}
    </>
  );
}
