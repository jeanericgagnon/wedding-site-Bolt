import { CheckCircle2, Clock, Users, XCircle } from 'lucide-react';
import { Card } from '../../../components/ui';

type GuestSnapshotStats = {
  confirmed: number;
  declined: number;
  pending: number;
  rsvpRate: number;
  total: number;
};

type GuestMealSummary = {
  withDietaryNote: number;
  withMealChoice: number;
};

type GuestContactStats = {
  contactCoverage: number;
};

type GuestEventReport = {
  attending: number;
  declined: number;
  id: string;
  invited: number;
  name: string;
  pending: number;
};

type GuestCustomAnswerRollup = {
  answer: string;
  count: number;
  question: string;
};

type GuestSongRequestEntry = {
  answer: string;
  guestName: string;
  question: string;
};

type GuestRsvpOps = {
  ceremonyNo: number;
  missingMeal: number;
  noResponse: number;
  pendingNoEmail: number;
  plusOneMissingName: number;
  receptionNo: number;
};

export interface GuestSnapshotInsightsPanelProps {
  contactStats: GuestContactStats;
  customAnswerRollup: GuestCustomAnswerRollup[];
  eventReport: GuestEventReport[];
  mealChoiceRollup: [string, number][];
  mealSummary: GuestMealSummary;
  rsvpOps: GuestRsvpOps;
  songRequestEntries: GuestSongRequestEntry[];
  stats: GuestSnapshotStats;
  onFocusCeremonyNo: () => void;
  onFocusMissingMeal: () => void;
  onFocusNoResponse: () => void;
  onFocusPendingNoEmail: () => void;
  onFocusPlusOneMissing: () => void;
  onFocusReceptionNo: () => void;
}

export function GuestSnapshotInsightsPanel({
  contactStats,
  customAnswerRollup,
  eventReport,
  mealChoiceRollup,
  mealSummary,
  rsvpOps,
  songRequestEntries,
  stats,
  onFocusCeremonyNo,
  onFocusMissingMeal,
  onFocusNoResponse,
  onFocusPendingNoEmail,
  onFocusPlusOneMissing,
  onFocusReceptionNo,
}: GuestSnapshotInsightsPanelProps) {
  return (
    <details className="rounded-2xl border border-border-subtle bg-white p-4 shadow-sm">
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Snapshot</p>
            <p className="mt-3 text-sm font-semibold text-text-primary">RSVP insights and guest detail rollups</p>
            <p className="mt-2 text-sm leading-6 text-text-secondary">Open the broader counts, meal coverage, event-level replies, and custom-answer patterns when you want the fuller picture.</p>
          </div>
          <span className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-3 py-1 text-xs text-text-tertiary">View details</span>
        </div>
      </summary>
      <div className="mt-3 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card variant="bordered" padding="md">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" aria-hidden="true" />
              <div>
                <p className="text-xl font-bold text-text-primary">{stats.total}</p>
                <p className="text-xs text-text-secondary">Invited</p>
              </div>
            </div>
          </Card>
          <Card variant="bordered" padding="md">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-success" aria-hidden="true" />
              <div>
                <p className="text-xl font-bold text-text-primary">{stats.confirmed}</p>
                <p className="text-xs text-text-secondary">Coming</p>
              </div>
            </div>
          </Card>
          <Card variant="bordered" padding="md">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-text-tertiary" aria-hidden="true" />
              <div>
                <p className="text-xl font-bold text-text-primary">{stats.declined}</p>
                <p className="text-xs text-text-secondary">Cannot make it</p>
              </div>
            </div>
          </Card>
          <Card variant="bordered" padding="md">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-text-tertiary" aria-hidden="true" />
              <div>
                <p className="text-xl font-bold text-text-primary">{stats.pending}</p>
                <p className="text-xs text-text-secondary">Pending</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card variant="bordered" padding="md">
            <p className="text-xs font-medium text-text-tertiary">Replies</p>
            <p className="mt-1 text-xl font-bold text-text-primary">{stats.rsvpRate}%</p>
            <p className="mt-1 text-xs text-text-secondary">Guests who already replied</p>
          </Card>
          <Card variant="bordered" padding="md">
            <p className="text-xs font-medium text-text-tertiary">Meal choices</p>
            <p className="mt-1 text-xl font-bold text-text-primary">{mealSummary.withMealChoice}</p>
            <p className="mt-1 text-xs text-text-secondary">Guests with a meal choice saved</p>
          </Card>
          <Card variant="bordered" padding="md">
            <p className="text-xs font-medium text-text-tertiary">Dietary notes</p>
            <p className="mt-1 text-xl font-bold text-text-primary">{mealSummary.withDietaryNote}</p>
            <p className="mt-1 text-xs text-text-secondary">Guests with dietary detail captured</p>
          </Card>
          <Card variant="bordered" padding="md">
            <p className="text-xs font-medium text-text-tertiary">Reachable guests</p>
            <p className="mt-1 text-xl font-bold text-text-primary">{contactStats.contactCoverage}%</p>
            <p className="mt-1 text-xs text-text-secondary">Guests with email or phone on file</p>
          </Card>
        </div>

        {(eventReport.length > 0 || mealChoiceRollup.length > 0 || customAnswerRollup.length > 0) && (
          <div className="grid gap-3 lg:grid-cols-3">
            <Card variant="bordered" padding="md">
              <p className="text-sm font-semibold text-text-primary">By event</p>
              <div className="mt-3 space-y-2.5">
                {eventReport.length === 0 ? (
                  <p className="text-sm text-text-secondary">No event-level reporting yet.</p>
                ) : eventReport.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-border-subtle bg-white px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-text-primary">{event.name}</p>
                      <span className="text-xs text-text-tertiary">Invited {event.invited}</span>
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">Yes {event.attending} · No {event.declined} · Pending {event.pending}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card variant="bordered" padding="md">
              <p className="text-sm font-semibold text-text-primary">Meals</p>
              <div className="mt-3 space-y-2.5">
                {mealChoiceRollup.length === 0 ? (
                  <p className="text-sm text-text-secondary">No meal data yet.</p>
                ) : mealChoiceRollup.slice(0, 6).map(([meal, count]) => (
                  <div key={meal} className="flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-white px-3 py-2.5">
                    <span className="text-sm text-text-primary">{meal}</span>
                    <span className="text-sm font-semibold text-text-primary">{count}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card variant="bordered" padding="md">
              <p className="text-sm font-semibold text-text-primary">Top custom answers</p>
              <div className="mt-3 space-y-2.5">
                {customAnswerRollup.length === 0 ? (
                  <p className="text-sm text-text-secondary">No custom answers captured yet.</p>
                ) : customAnswerRollup.map((entry, index) => (
                  <div key={`${entry.question}-${entry.answer}-${index}`} className="rounded-2xl border border-border-subtle bg-white px-3 py-2.5">
                    <p className="text-xs text-text-tertiary">{entry.question}</p>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <span className="text-sm text-text-primary">{entry.answer}</span>
                      <span className="text-sm font-semibold text-text-primary">{entry.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card variant="bordered" padding="md">
              <p className="text-sm font-semibold text-text-primary">Song requests</p>
              <div className="mt-3 space-y-2.5">
                {songRequestEntries.length === 0 ? (
                  <p className="text-sm text-text-secondary">No song requests captured yet.</p>
                ) : songRequestEntries.map((entry, index) => (
                  <div key={`${entry.guestName}-${entry.answer}-${index}`} className="rounded-2xl border border-border-subtle bg-white px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-text-primary">{entry.answer}</p>
                      <span className="text-xs text-text-tertiary">{entry.guestName}</span>
                    </div>
                    <p className="mt-1 text-xs text-text-tertiary">{entry.question}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
          <button onClick={onFocusMissingMeal} className="text-left rounded-2xl border border-border-subtle p-2.5 transition-colors hover:border-primary/40 hover:bg-primary/5">
            <p className="text-xs text-text-tertiary">Missing meal</p>
            <p className="text-base font-semibold text-text-primary">{rsvpOps.missingMeal}</p>
          </button>
          <button onClick={onFocusPlusOneMissing} className="text-left rounded-2xl border border-border-subtle p-2.5 transition-colors hover:border-primary/40 hover:bg-primary/5">
            <p className="text-xs text-text-tertiary">Plus-one missing</p>
            <p className="text-base font-semibold text-text-primary">{rsvpOps.plusOneMissingName}</p>
          </button>
          <button onClick={onFocusNoResponse} className="text-left rounded-2xl border border-border-subtle p-2.5 transition-colors hover:border-primary/40 hover:bg-primary/5">
            <p className="text-xs text-text-tertiary">No response</p>
            <p className="text-base font-semibold text-text-primary">{rsvpOps.noResponse}</p>
          </button>
          <button onClick={onFocusPendingNoEmail} className="text-left rounded-2xl border border-border-subtle p-2.5 transition-colors hover:border-primary/40 hover:bg-primary/5">
            <p className="text-xs text-text-tertiary">Pending, no email</p>
            <p className="text-base font-semibold text-text-primary">{rsvpOps.pendingNoEmail}</p>
          </button>
          <button onClick={onFocusCeremonyNo} className="text-left rounded-2xl border border-border-subtle p-2.5 transition-colors hover:border-primary/40 hover:bg-primary/5">
            <p className="text-xs text-text-tertiary">Ceremony: No</p>
            <p className="text-base font-semibold text-text-primary">{rsvpOps.ceremonyNo}</p>
          </button>
          <button onClick={onFocusReceptionNo} className="text-left rounded-2xl border border-border-subtle p-2.5 transition-colors hover:border-primary/40 hover:bg-primary/5">
            <p className="text-xs text-text-tertiary">Reception: No</p>
            <p className="text-base font-semibold text-text-primary">{rsvpOps.receptionNo}</p>
          </button>
        </div>
        <p className="text-xs text-text-tertiary">These quick counts are shortcuts into the guest workspace below when you want to resolve the specific people behind the numbers.</p>
      </div>
    </details>
  );
}
