import React from 'react';
import { X } from 'lucide-react';
import { Button, Input, Select, Textarea } from '../../../components/ui';
import { GUEST_LANGUAGE_LABELS, SUPPORTED_GUEST_LANGUAGES } from '../../../lib/guestLanguagePreference';
import type { GuestWithRSVP, ItineraryEvent } from './guestDashboardTypes';

export type AssistedRsvpSource = 'phone' | 'text' | 'family' | 'in-person';
export type AssistedRsvpStatus = 'confirmed' | 'declined';

export interface GuestFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  preferred_language: string;
  plus_one_allowed: boolean;
  require_plus_one_name: boolean;
  invited_to_ceremony: boolean;
  invited_to_reception: boolean;
}

export interface GuestFormModalProps {
  effectiveItineraryEvents: ItineraryEvent[];
  formData: GuestFormData;
  formEventInviteIds: Set<string>;
  itineraryFilterEventCount: number;
  submitLabel: string;
  title: string;
  onClose: () => void;
  onSetFormData: React.Dispatch<React.SetStateAction<GuestFormData>>;
  onSetFormEventInviteIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  onSubmit: (event: React.FormEvent) => void;
}

export function GuestFormModal({
  effectiveItineraryEvents,
  formData,
  formEventInviteIds,
  itineraryFilterEventCount,
  submitLabel,
  title,
  onClose,
  onSetFormData,
  onSetFormEventInviteIds,
  onSubmit,
}: GuestFormModalProps) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="guest-modal-title">
        <div className="bg-surface rounded-[20px] max-w-md w-full p-6 max-h-[90vh] overflow-y-auto border border-border-subtle">
          <div className="flex justify-between items-center mb-5">
            <h2 id="guest-modal-title" className="text-xl font-semibold text-text-primary">{title}</h2>
            <button onClick={onClose} className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-subtle rounded-xl transition-colors" aria-label="Close">
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">First Name *</label>
              <Input
                value={formData.first_name}
                onChange={(event) => onSetFormData({ ...formData, first_name: event.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Last Name *</label>
              <Input
                value={formData.last_name}
                onChange={(event) => onSetFormData({ ...formData, last_name: event.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(event) => onSetFormData({ ...formData, email: event.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Phone</label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(event) => onSetFormData({ ...formData, phone: event.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Guest language</label>
              <Select
                value={formData.preferred_language}
                onChange={(event) => onSetFormData({ ...formData, preferred_language: event.target.value })}
                options={[
                  { value: '', label: 'Use site default' },
                  ...SUPPORTED_GUEST_LANGUAGES.map((language) => ({
                    value: language,
                    label: GUEST_LANGUAGE_LABELS[language],
                  })),
                ]}
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.plus_one_allowed}
                  onChange={(event) => onSetFormData({ ...formData, plus_one_allowed: event.target.checked, require_plus_one_name: event.target.checked ? formData.require_plus_one_name : false })}
                  className="rounded"
                />
                <span className="text-sm text-text-primary">Allow Plus One</span>
              </label>

              {formData.plus_one_allowed && (
                <label className="flex items-center gap-2 pl-6">
                  <input
                    type="checkbox"
                    checked={formData.require_plus_one_name}
                    onChange={(event) => onSetFormData({ ...formData, require_plus_one_name: event.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-text-primary">Require plus-one name</span>
                </label>
              )}

              {effectiveItineraryEvents.length > 0 && (
                <div className="pt-1 border-t border-border-subtle">
                  <p className="text-xs font-medium text-text-secondary mb-2">Itinerary invitations</p>
                  {itineraryFilterEventCount === 0 && (
                    <p className="text-[11px] text-text-tertiary mb-2">No itinerary events yet — using Ceremony/Reception defaults for now.</p>
                  )}
                  <div className="space-y-1.5 max-h-40 overflow-auto pr-1">
                    {effectiveItineraryEvents.map((event) => {
                      const checked = formEventInviteIds.has(event.id);
                      return (
                        <label key={event.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(inputEvent) => {
                              const next = new Set(formEventInviteIds);
                              if (inputEvent.target.checked) next.add(event.id);
                              else next.delete(event.id);
                              onSetFormEventInviteIds(next);
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-text-primary truncate">{event.event_name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" fullWidth onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" fullWidth>
                {submitLabel}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export interface AssistedRsvpModalProps {
  guest: GuestWithRSVP;
  notes: string;
  saving: boolean;
  source: AssistedRsvpSource;
  status: AssistedRsvpStatus;
  onClose: () => void;
  onSave: () => void;
  onSetNotes: (notes: string) => void;
  onSetSource: (source: AssistedRsvpSource) => void;
  onSetStatus: (status: AssistedRsvpStatus) => void;
}

export function AssistedRsvpModal({
  guest,
  notes,
  saving,
  source,
  status,
  onClose,
  onSave,
  onSetNotes,
  onSetSource,
  onSetStatus,
}: AssistedRsvpModalProps) {
  const guestName = guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.name;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={() => !saving && onClose()} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-[20px] border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Record RSVP for guest</h3>
              <p className="text-sm text-text-secondary mt-1">Save a response that came in by phone, text, family relay, or in person.</p>
            </div>
            <button onClick={() => !saving && onClose()} className="p-2 rounded-xl hover:bg-surface-subtle text-text-secondary">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div className="rounded-[20px] border border-border-subtle bg-surface-subtle/30 p-4">
              <p className="text-sm font-medium text-text-primary">{guestName}</p>
              <p className="mt-1 text-xs text-text-secondary">This keeps assisted responses clear without pretending the guest submitted it themselves.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Response</label>
                <Select value={status} onChange={(event) => onSetStatus(event.target.value as AssistedRsvpStatus)} options={[{ value: 'confirmed', label: 'Attending' }, { value: 'declined', label: 'Declined' }]} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Source</label>
                <Select value={source} onChange={(event) => onSetSource(event.target.value as AssistedRsvpSource)} options={[{ value: 'phone', label: 'Phone call' }, { value: 'text', label: 'Text message' }, { value: 'family', label: 'Family relay' }, { value: 'in-person', label: 'In person' }]} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Notes</label>
              <Textarea value={notes} onChange={(event) => onSetNotes(event.target.value)} placeholder="Optional detail, like who confirmed it or what still needs follow-up." rows={4} />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button variant="primary" size="md" onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save assisted RSVP'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export interface DeleteAllGuestsModalProps {
  busy: boolean;
  confirmInput: string;
  guestCount: number;
  onCancel: () => void;
  onConfirm: () => void;
  onSetConfirmInput: (value: string) => void;
}

export function DeleteAllGuestsModal({
  busy,
  confirmInput,
  guestCount,
  onCancel,
  onConfirm,
  onSetConfirmInput,
}: DeleteAllGuestsModalProps) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={() => !busy && onCancel()} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-surface rounded-[20px] border border-border-subtle w-full max-w-md">
          <div className="p-6 border-b border-border-subtle">
            <h2 className="text-lg font-semibold text-text-primary">Delete all guests</h2>
            <p className="text-sm text-text-secondary mt-1">This permanently deletes every guest in this site.</p>
          </div>
          <div className="p-6 space-y-3">
            <div className="rounded-xl border border-border-subtle bg-surface-subtle px-3 py-2 text-sm text-text-secondary">
              Type <span className="font-semibold">{guestCount}</span> to confirm deletion.
            </div>
            <input
              type="text"
              value={confirmInput}
              onChange={(event) => onSetConfirmInput(event.target.value)}
              placeholder={`Type ${guestCount}`}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              disabled={busy}
            />
          </div>
          <div className="p-6 pt-0 flex gap-2">
            <Button variant="outline" fullWidth disabled={busy} onClick={onCancel}>
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              className="!bg-text-primary hover:!bg-text-secondary"
              disabled={busy || confirmInput.trim() !== String(guestCount)}
              onClick={onConfirm}
            >
              {busy ? 'Deleting…' : 'Delete all guests'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
