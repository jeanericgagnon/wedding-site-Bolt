import { Button } from '../../../components/ui';
import type { RsvpCampaignPreset } from './guestDashboardStorage';

type GuestCampaignRsvpOps = {
  missingMeal: number;
  noResponse: number;
  pendingNoEmail: number;
  plusOneMissingName: number;
  ceremonyNo: number;
  receptionNo: number;
};

type GuestReminderPreview = {
  email?: string | null;
  id: string;
  name: string;
};

export interface GuestCampaignReminderPanelProps {
  campaignPreset: RsvpCampaignPreset;
  campaignReadiness: number;
  canEditGuests: boolean;
  contactNoContactCount: number;
  daysToWedding: number | null;
  manualFollowUpCount: number;
  manualHandledCount: number;
  reminderCandidates: GuestReminderPreview[];
  rsvpOps: GuestCampaignRsvpOps;
  segmentLabel: string;
  showCampaignModal: boolean;
  showRecipientPreview: boolean;
  skipRecentlyInvited: boolean;
  onApplyCampaignPreset: (preset: RsvpCampaignPreset) => void;
  onCloseCampaignModal: () => void;
  onFocusHandledPersonally: () => void;
  onFocusHighRiskFirst: () => void;
  onFocusMissingContact: () => void;
  onFocusMissingMeal: () => void;
  onFocusPending: () => void;
  onFocusPendingNoEmail: () => void;
  onFocusPlusOneNames: () => void;
  onOpenCampaignModal: () => void;
  onSetShowRecipientPreview: (show: boolean | ((previous: boolean) => boolean)) => void;
  onSetSkipRecentlyInvited: (skip: boolean) => void;
}

export function GuestCampaignReminderPanel({
  campaignPreset,
  campaignReadiness,
  canEditGuests,
  contactNoContactCount,
  daysToWedding,
  manualFollowUpCount,
  manualHandledCount,
  reminderCandidates,
  rsvpOps,
  segmentLabel,
  showCampaignModal,
  showRecipientPreview,
  skipRecentlyInvited,
  onApplyCampaignPreset,
  onCloseCampaignModal,
  onFocusHandledPersonally,
  onFocusHighRiskFirst,
  onFocusMissingContact,
  onFocusMissingMeal,
  onFocusPending,
  onFocusPendingNoEmail,
  onFocusPlusOneNames,
  onOpenCampaignModal,
  onSetShowRecipientPreview,
  onSetSkipRecentlyInvited,
}: GuestCampaignReminderPanelProps) {
  return (
    <>
      <div className="rounded-[20px] border border-border-subtle bg-white p-4 shadow-none">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Campaigns</p>
            <p className="mt-3 text-sm font-semibold text-text-primary">Campaign insights and reminder prep</p>
            <p className="text-xs text-text-secondary mt-1">
              Segment: <span className="font-semibold text-text-primary">{segmentLabel}</span> · Eligible: <span className="font-semibold text-text-primary">{reminderCandidates.length}</span>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onOpenCampaignModal} disabled={!canEditGuests}>Open</Button>
        </div>
      </div>

      {showCampaignModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-3">
          <div className="w-full max-w-2xl max-h-[88vh] overflow-auto rounded-[20px] border border-border bg-white shadow-none">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Campaign workspace</p>
                <p className="mt-2 text-sm font-semibold text-text-primary">Campaign insights and reminder controls</p>
                <p className="text-xs text-text-tertiary mt-1">Focused controls without cluttering the main screen</p>
              </div>
              <Button variant="ghost" size="sm" onClick={onCloseCampaignModal}>Close</Button>
            </div>

            <div className="p-4 space-y-3">
              <div className="text-xs text-text-secondary">
                Worth checking: <span className="font-medium text-text-primary">No response ({rsvpOps.noResponse})</span> · <span className="font-medium text-text-primary">Personal follow-up ({manualFollowUpCount})</span> · <span className="font-medium text-text-primary">Handled personally ({manualHandledCount})</span> · <span className="font-medium text-text-primary">Pending without email ({rsvpOps.pendingNoEmail})</span> · <span className="font-medium text-text-primary">Missing contact info ({contactNoContactCount})</span>
              </div>
              {daysToWedding !== null && (
                <div className={`text-xs rounded-xl px-2 py-1 inline-flex items-center gap-1 ${daysToWedding <= 30 ? 'bg-surface-subtle text-text-secondary border border-border-subtle' : 'bg-primary/5 text-primary border border-primary/20'}`}>
                  Wedding in {daysToWedding} day{daysToWedding === 1 ? '' : 's'}
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-xs text-text-secondary">
                  Segment: <span className="font-semibold text-text-primary">{segmentLabel}</span> ·
                  Eligible reminders: <span className="font-semibold text-text-primary">{reminderCandidates.length}</span> ·
                  Reminder detail: <span className="font-semibold text-text-primary">{campaignReadiness}%</span>
                </p>
                <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
                  <input
                    type="checkbox"
                    checked={skipRecentlyInvited}
                    disabled={!canEditGuests}
                    onChange={(event) => onSetSkipRecentlyInvited(event.target.checked)}
                  />
                  Skip guests invited in last 24h
                </label>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-xs text-text-secondary w-28">Campaign preset</label>
                <select
                  value={campaignPreset}
                  disabled={!canEditGuests}
                  onChange={(event) => onApplyCampaignPreset(event.target.value as RsvpCampaignPreset)}
                  className="text-xs border border-border rounded-xl px-2 py-1.5 bg-white text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="pending">Pending responses ({rsvpOps.noResponse})</option>
                  <option value="missing-meal">Missing meal ({rsvpOps.missingMeal})</option>
                  <option value="plusone-missing">Missing plus-one name ({rsvpOps.plusOneMissingName})</option>
                  <option value="ceremony-no">Ceremony: No ({rsvpOps.ceremonyNo})</option>
                  <option value="reception-no">Reception: No ({rsvpOps.receptionNo})</option>
                  <option value="pending-no-email">Pending, no email ({rsvpOps.pendingNoEmail})</option>
                  <option value="manual-handled">Handled personally ({manualHandledCount})</option>
                </select>
              </div>

              {reminderCandidates.length > 0 && (
                <div className="space-y-1">
                  <button
                    onClick={() => onSetShowRecipientPreview((value) => !value)}
                    className="text-xs text-primary hover:underline"
                  >
                    {showRecipientPreview ? 'Hide' : 'Show'} recipient preview ({reminderCandidates.length})
                  </button>
                  {showRecipientPreview && (
                    <div className="max-h-28 overflow-auto rounded-xl border border-border bg-white p-2 text-xs text-text-secondary">
                      {reminderCandidates.slice(0, 20).map((guest) => (
                        <div key={guest.id} className="py-0.5">
                          {guest.name}
                          {guest.email ? ` · ${guest.email}` : ''}
                        </div>
                      ))}
                      {reminderCandidates.length > 20 && (
                        <div className="pt-1 text-text-tertiary">+{reminderCandidates.length - 20} more</div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button onClick={onFocusPending} className="text-[11px] px-2 py-1 rounded-xl border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Focus pending</button>
                <button onClick={onFocusMissingMeal} className="text-[11px] px-2 py-1 rounded-xl border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Focus missing meal</button>
                <button onClick={onFocusPlusOneNames} className="text-[11px] px-2 py-1 rounded-xl border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Focus plus-one names</button>
                <button onClick={onFocusPendingNoEmail} className="text-[11px] px-2 py-1 rounded-xl border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Focus pending without email</button>
                <button onClick={onFocusHandledPersonally} className="text-[11px] px-2 py-1 rounded-xl border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Focus handled personally</button>
                <button onClick={onFocusHighRiskFirst} className="text-[11px] px-2 py-1 rounded-xl border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Focus high-risk first</button>
                <button onClick={onFocusMissingContact} className="text-[11px] px-2 py-1 rounded-xl border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Review missing contact ({contactNoContactCount})</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
