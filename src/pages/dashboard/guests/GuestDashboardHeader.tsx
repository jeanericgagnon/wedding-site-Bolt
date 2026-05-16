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
        eyebrow="Guests & RSVP"
        title="People, replies, and details."
        description="Keep guest names, RSVPs, meals, households, and contact details in one place."
        stats={[
          { label: 'Guests', value: `${stats.total} added`, detail: `${contactCoverage}% reachable` },
          { label: 'Replies', value: stats.rsvpRate >= 70 ? 'Most have replied' : `${stats.confirmed} coming`, detail: `${stats.pending} waiting` },
          { label: 'Follow-up', value: rsvpNoResponseCount > 0 ? 'Worth reviewing' : 'Guest-ready', detail: rsvpNoResponseCount > 0 ? 'reminders can help' : 'no reminder needed' },
        ]}
        actions={
          <>
            <a href="/dashboard/rsvp-board" className="rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm font-medium text-text-primary no-underline hover:bg-surface-subtle">Review RSVPs</a>
            <button
              onClick={onAddGuest}
              disabled={!canEditGuests}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              Add guest
            </button>
          </>
        }
      >
        <div className="flex flex-wrap items-end gap-2">
          <div className="inline-flex rounded-lg border border-border-subtle bg-white p-1">
            <button className="px-3 py-1.5 text-sm rounded-md bg-surface-subtle text-text-primary border border-border-subtle" onClick={() => onSetGuestsTab('ops')}>Guests</button>
            <button className="px-3 py-1.5 text-sm rounded-md text-text-secondary" onClick={() => onSetGuestsTab('rsvp-config')}>RSVP Settings</button>
          </div>
          <button
            onClick={onToggleInsights}
            className="px-3 py-1.5 text-xs rounded-md border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary"
          >
            {showInsights ? 'Hide insights' : 'Show insights'}
          </button>
        </div>
      </DashboardPageHero>

      {csvImportSummary && (
        <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-3 py-3 text-sm space-y-2">
          <p className="font-medium text-text-primary">Last import summary</p>
          <p className="text-text-secondary">Imported {csvImportSummary.imported} guest{csvImportSummary.imported === 1 ? '' : 's'} · rows needing review {csvImportSummary.skipped} · household groups {csvImportSummary.householdKeys} · household matches left separate {csvImportSummary.guardedHouseholds} · event names to review {csvImportSummary.unknownEvents} · possible repeats {csvImportSummary.duplicateNames}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-text-secondary">
              <p className="font-medium">What came through</p>
              <p className="mt-1">Guest rows imported, event links mapped where possible, and safer household grouping applied when the keys looked trustworthy.</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-white px-3 py-2 text-text-secondary">
              <p className="font-medium">Still review</p>
              <p className="mt-1">Check rows that need names, possible repeats, household matches left separate, event names to review, and any guests still missing direct contact info.</p>
            </div>
          </div>
        </div>
      )}

      {guestsRole === 'planner' && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
          Planner view is on. This view stays focused on guest follow-up, response cleanup, and who still needs a nudge.
        </div>
      )}
    </>
  );
}
