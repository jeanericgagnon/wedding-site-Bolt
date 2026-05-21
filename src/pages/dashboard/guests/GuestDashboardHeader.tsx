import { Link } from 'react-router-dom';
import { DashboardPageHero } from '../../../components/dashboard/DashboardPageHero';
import type { PlannerAccessRole } from '../../../lib/plannerAccess';

export interface GuestImportSummary {
  duplicateNames: number;
  guardedHouseholds: number;
  householdKeys: number;
  imported: number;
  skipped: number;
  unknownEvents: number;
}

interface GuestDashboardHeaderProps {
  canEditGuests: boolean;
  contactCoverage: number;
  csvImportSummary: GuestImportSummary | null;
  guestsRole: PlannerAccessRole;
  rsvpNoResponseCount: number;
  showInsights: boolean;
  stats: {
    confirmed: number;
    pending: number;
    rsvpRate: number;
    total: number;
  };
  onAddGuest: () => void;
  onSetGuestsTab: (tab: 'ops' | 'rsvp-config') => void;
  onToggleInsights: () => void;
}

export function GuestDashboardHeader({
  canEditGuests,
  contactCoverage,
  csvImportSummary,
  guestsRole,
  rsvpNoResponseCount,
  showInsights,
  stats,
  onAddGuest,
  onSetGuestsTab,
  onToggleInsights,
}: GuestDashboardHeaderProps) {
  return (
    <>
      <DashboardPageHero
        eyebrow="Guests"
        title="People, replies, and details."
        description="Guest list, RSVPs, contact details, reminders, check-in, and guest-specific links in one place."
        stats={[
          { label: 'Guests', value: `${stats.total} invited`, detail: `${stats.pending} pending` },
          { label: 'Replies', value: stats.rsvpRate > 0 ? `${stats.rsvpRate}% replied` : 'Ready to collect', detail: `${stats.confirmed} confirmed so far` },
          { label: 'Contact details', value: `${contactCoverage}% reachable`, detail: rsvpNoResponseCount > 0 ? `${rsvpNoResponseCount} worth reviewing` : 'No reminder needed' },
        ]}
        actions={
          <>
            <Link to="/dashboard/guests?tab=rsvps" className="inline-flex min-h-[44px] items-center rounded-lg border border-border-strong bg-surface px-4 text-sm font-medium text-text-primary no-underline hover:bg-surface-subtle">Review RSVPs</Link>
            <button
              onClick={onAddGuest}
              disabled={!canEditGuests}
              className="inline-flex min-h-[44px] items-center rounded-lg border border-primary bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              Add guest
            </button>
          </>
        }
      >
        <div className="flex flex-wrap items-end gap-2">
          <div className="inline-flex rounded-lg border border-border bg-surface p-1">
            <button className="rounded-md border border-border bg-surface-subtle px-3 py-1.5 text-sm text-text-primary" onClick={() => onSetGuestsTab('ops')}>Guest list</button>
            <button className="rounded-md px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-subtle hover:text-text-primary" onClick={() => onSetGuestsTab('rsvp-config')}>RSVPs</button>
          </div>
          <button
            onClick={onToggleInsights}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text-secondary hover:border-primary/40 hover:text-primary"
          >
            {showInsights ? 'Hide summary' : 'Show summary'}
          </button>
        </div>
      </DashboardPageHero>

      {csvImportSummary && (
        <div className="space-y-2 rounded-[20px] border border-border bg-surface px-5 py-4 text-sm shadow-none">
          <p className="font-medium text-text-primary">Last import summary</p>
          <p className="text-text-secondary">Imported {csvImportSummary.imported} guest{csvImportSummary.imported === 1 ? '' : 's'} · rows needing review {csvImportSummary.skipped} · household groups {csvImportSummary.householdKeys} · household matches left separate {csvImportSummary.guardedHouseholds} · event names to review {csvImportSummary.unknownEvents} · possible repeats {csvImportSummary.duplicateNames}</p>
          <p className="text-xs text-text-tertiary">Tip: review skipped rows, possible repeats, and missing contact details before sending reminders.</p>
        </div>
      )}

      {guestsRole === 'planner' && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-primary">
          Planner view is on. This view stays focused on guest follow-up, response cleanup, and who still needs a nudge.
        </div>
      )}
    </>
  );
}
