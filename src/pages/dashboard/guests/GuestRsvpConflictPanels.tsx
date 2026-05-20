import { AlertCircle } from 'lucide-react';
import { Button, Select } from '../../../components/ui';
import type { GuestWithRSVP, RsvpConflict, RsvpConflictStats } from './guestDashboardTypes';

interface GuestRsvpConflictPanelsProps {
  conflictFilter: 'all' | 'error' | 'warning';
  guests: GuestWithRSVP[];
  isGuestsReadOnly: boolean;
  resolvingConflictId: string | null;
  rsvpConflicts: RsvpConflict[];
  rsvpConflictStats: RsvpConflictStats;
  showConflictDetails: boolean;
  visibleRsvpConflicts: RsvpConflict[];
  onResolveAllVisibleConflicts: () => void;
  onResolveConflict: (conflictId: string) => void;
  onReviewPending: () => void;
  onSetConflictFilter: (filter: 'all' | 'error' | 'warning') => void;
  onToggleConflictDetails: () => void;
}

function buildLocalRsvpConflicts(guests: GuestWithRSVP[]): string[] {
  const conflicts: string[] = [];
  const emailsSeen = new Map<string, string>();

  guests.forEach((guest) => {
    const guestName = `${guest.first_name ?? ''} ${guest.last_name ?? ''}`.trim();
    if (guest.email) {
      const key = guest.email.toLowerCase();
      if (emailsSeen.has(key)) {
        conflicts.push(`Duplicate email ${guest.email}: ${emailsSeen.get(key)} and ${guestName}`);
      } else {
        emailsSeen.set(key, guestName);
      }
    }
    if (guest.plus_one_allowed && guest.rsvp?.attending === false) {
      conflicts.push(`${guestName} declined but still has plus-one allowed`);
    }
  });

  return conflicts;
}

export function GuestRsvpConflictPanels({
  conflictFilter,
  guests,
  isGuestsReadOnly,
  resolvingConflictId,
  rsvpConflicts,
  rsvpConflictStats,
  showConflictDetails,
  visibleRsvpConflicts,
  onResolveAllVisibleConflicts,
  onResolveConflict,
  onReviewPending,
  onSetConflictFilter,
  onToggleConflictDetails,
}: GuestRsvpConflictPanelsProps) {
  const localConflicts = buildLocalRsvpConflicts(guests);

  return (
    <>
      {localConflicts.length > 0 && (
        <div className="rounded-2xl border border-border-subtle bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <AlertCircle className="w-4 h-4 text-text-tertiary flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Guest review</p>
                <p className="mt-1 text-sm font-medium text-text-primary">{localConflicts.length} RSVP {localConflicts.length === 1 ? 'item' : 'items'} to review</p>
              </div>
            </div>
            <button
              onClick={onReviewPending}
              className="rounded-xl border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:bg-white"
            >
              Review pending
            </button>
          </div>
          <ul className="space-y-0.5">
            {localConflicts.map((conflict, index) => (
              <li key={index} className="text-xs text-text-secondary">• {conflict}</li>
            ))}
          </ul>
        </div>
      )}

      {rsvpConflicts.length > 0 && (
        <div className="rounded-2xl border border-border-subtle bg-white p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-text-tertiary" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Conflict queue</p>
                <p className="mt-1 text-sm font-medium text-text-primary">{rsvpConflicts.length} RSVP {rsvpConflicts.length === 1 ? 'item' : 'items'} to review</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={conflictFilter}
                onChange={(event) => onSetConflictFilter(event.target.value as 'all' | 'error' | 'warning')}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'error', label: 'Needs attention' },
                  { value: 'warning', label: 'Heads-up' },
                ]}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={isGuestsReadOnly || visibleRsvpConflicts.length === 0 || resolvingConflictId === 'all'}
                onClick={onResolveAllVisibleConflicts}
              >
                {resolvingConflictId === 'all' ? 'Resolving…' : `Resolve ${visibleRsvpConflicts.length}`}
              </Button>
            </div>
          </div>
          <div className="text-xs text-text-secondary">
            {rsvpConflictStats.unresolvedOver72h > 0
              ? `${rsvpConflictStats.unresolvedOver72h} item${rsvpConflictStats.unresolvedOver72h === 1 ? '' : 's'} have been waiting over 3 days.`
              : rsvpConflictStats.unresolvedOver24h > 0
                ? `${rsvpConflictStats.unresolvedOver24h} item${rsvpConflictStats.unresolvedOver24h === 1 ? '' : 's'} have been waiting over a day.`
                : 'You have RSVP items ready for review.'}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleConflictDetails}
            >
              {showConflictDetails ? 'Hide details' : 'View details'}
            </Button>
          </div>

          {showConflictDetails && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="rounded-xl border border-border-subtle bg-white/80 px-2.5 py-2">
                  <p className="text-[10px] text-text-tertiary">Open now</p>
                  <p className="text-sm font-semibold text-text-primary">{rsvpConflictStats.openNow}</p>
                </div>
                <div className="rounded-xl border border-border-subtle bg-white/80 px-2.5 py-2">
                  <p className="text-[10px] text-text-tertiary">Opened (24h)</p>
                  <p className="text-sm font-semibold text-text-primary">{rsvpConflictStats.opened24h}</p>
                </div>
                <div className="rounded-xl border border-border-subtle bg-white/80 px-2.5 py-2">
                  <p className="text-[10px] text-text-tertiary">Resolved (24h)</p>
                  <p className="text-sm font-semibold text-text-primary">{rsvpConflictStats.resolved24h}</p>
                </div>
              </div>

              {rsvpConflictStats.topCodes.length > 0 && (
                <div className="text-[11px] text-text-secondary">
                  <span className="font-semibold">Top reasons:</span>{' '}
                  {rsvpConflictStats.topCodes.map((conflict) => `${conflict.code} (${conflict.count})`).join(' · ')}
                </div>
              )}
            </>
          )}

          <ul className="space-y-1.5">
            {visibleRsvpConflicts.slice(0, 8).map((conflict) => {
              const guestName = guests.find((guest) => guest.id === conflict.guest_id)?.name || 'Unknown guest';
              return (
                <li key={conflict.id} className="text-xs text-text-secondary flex items-start justify-between gap-3">
                  <span>
                    • {guestName}: {conflict.message}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isGuestsReadOnly || resolvingConflictId === conflict.id}
                    onClick={() => onResolveConflict(conflict.id)}
                  >
                    {resolvingConflictId === conflict.id ? 'Resolving…' : 'Resolve'}
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
