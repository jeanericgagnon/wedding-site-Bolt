import { AlertCircle } from 'lucide-react';

import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { formatRsvpDeadline } from './rsvpDeadline';
import type { ExistingRSVP, Guest, HouseholdGuest, RSVPMealConfig, RSVPQuestion } from './rsvpTypes';

interface RsvpFormData {
  attending: boolean;
  attendCeremony: boolean;
  attendReception: boolean;
  meal_choice: string;
  plus_one_name: string;
  children_count: number;
  notes: string;
}

interface RsvpFormViewProps {
  allowedChildrenCount: number;
  applyToHousehold: boolean;
  canSubmit: boolean;
  childCountOptions: Array<{ label: string; value: string }>;
  customAnswers: Record<string, string | string[]>;
  deadlinePassed: boolean;
  error: string;
  existingRsvp: ExistingRSVP | null;
  formData: RsvpFormData;
  formStep: 1 | 2 | 3;
  getQuestionLabel: (question: RSVPQuestion) => string;
  guest: Guest;
  guestDisplayName: string;
  goToNextFormStep: () => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  householdGuests: HouseholdGuest[];
  inheritedHouseholdMembers: HouseholdGuest[];
  invitedEvents: string[];
  loading: boolean;
  mealConfig: RSVPMealConfig;
  onBack: () => void;
  onHouseholdSelectionChange: (updater: (current: string[]) => string[]) => void;
  onHouseholdToggle: (nextValue: boolean) => void;
  onStepAnswerChange: (updater: (current: Record<string, string | string[]>) => Record<string, string | string[]>) => void;
  onStepDataChange: (updater: (current: RsvpFormData) => RsvpFormData) => void;
  rsvpDeadline: string | null;
  rsvpQuestions: RSVPQuestion[];
  rsvpSessionToken: string | null;
  safeMusicPlaylistUrl: string | null;
  selectedHouseholdGuestIds: string[];
  submitting: boolean;
}

export function RsvpFormView({
  allowedChildrenCount,
  applyToHousehold,
  canSubmit,
  childCountOptions,
  customAnswers,
  deadlinePassed,
  error,
  existingRsvp,
  formData,
  formStep,
  getQuestionLabel,
  goToNextFormStep,
  guest,
  guestDisplayName,
  handleSubmit,
  householdGuests,
  inheritedHouseholdMembers,
  invitedEvents,
  loading,
  mealConfig,
  onBack,
  onHouseholdSelectionChange,
  onHouseholdToggle,
  onStepAnswerChange,
  onStepDataChange,
  rsvpDeadline,
  rsvpQuestions,
  rsvpSessionToken,
  safeMusicPlaylistUrl,
  selectedHouseholdGuestIds,
  submitting,
}: RsvpFormViewProps) {
  return (
    <Card className="p-5 md:p-7">
      <div className="text-center mb-6">
        <h1 className="text-2xl md:text-3xl font-serif mb-2">Welcome, {guestDisplayName}!</h1>
        {existingRsvp && (
          <p className="text-sm text-gray-600">
            You've already responded. You can update your response below.
          </p>
        )}
      </div>

      {deadlinePassed && !existingRsvp && (
        <div className="mb-6 p-4 bg-surface-subtle/50 border border-border-subtle rounded-xl text-text-secondary text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">RSVP deadline has passed</p>
            <p className="mt-0.5">The deadline was {formatRsvpDeadline(rsvpDeadline)}. Please contact the couple directly.</p>
          </div>
        </div>
      )}

      {existingRsvp && (
        <>
          <div className="mb-6 p-4 bg-primary/5 border border-primary/15 rounded-xl text-text-secondary text-sm space-y-1">
            <p className="font-medium">We have your current RSVP on file.</p>
            <p>You can review or update your details here. If plans change later, use this same link again.</p>
          </div>
          <div className="mb-6 p-4 bg-surface-subtle/40 border border-border-subtle rounded-xl text-text-secondary text-sm space-y-1">
            <p className="font-medium text-text-primary">Check back here for updates</p>
            <p>The couple may refine timing, travel notes, or day-of details later. This same RSVP link will still bring you back to the right place.</p>
          </div>
        </>
      )}

      {deadlinePassed && existingRsvp && (
        <div className="mb-6 p-4 bg-surface-subtle/50 border border-border-subtle rounded-xl text-text-secondary text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          The RSVP deadline has passed, but you can still update your existing response.
        </div>
      )}

      {!rsvpSessionToken && (
        <div className="mb-6 p-4 bg-surface-subtle/50 border border-border-subtle rounded-xl text-text-secondary text-base space-y-2">
          <div className="flex items-start gap-2 font-medium">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            Can't submit — missing invitation link
          </div>
          <p className="pl-7 text-sm text-text-secondary">To RSVP, open the invitation email you received and click the RSVP button. That link takes you to the right response for your invitation.</p>
        </div>
      )}

      <div className="mb-5 p-4 bg-surface-subtle/40 border border-border-subtle rounded-xl">
        <div className="flex items-center gap-2 text-xs">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`flex items-center gap-2 ${n < 3 ? 'flex-1' : ''}`}>
              <div className={`w-6 h-6 rounded-xl grid place-items-center font-semibold ${formStep >= n ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>{n}</div>
              {n < 3 && <div className={`h-0.5 flex-1 ${formStep > n ? 'bg-primary/50' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-gray-600">{formStep === 1 ? 'Step 1: Attendance' : formStep === 2 ? 'Step 2: Details' : 'Step 3: Final review & submit'} · {Math.round((formStep / 3) * 100)}% complete</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {formStep === 1 && (
          <>
            <div>
              <label className="block text-base font-semibold mb-2">Will you be attending?</label>
              <Select
                value={formData.attending ? 'yes' : 'no'}
                onChange={(e) => onStepDataChange((current) => ({ ...current, attending: e.target.value === 'yes' }))}
                className="h-12 text-base"
                required
                options={[
                  { value: 'yes', label: "Yes, I'll be there!" },
                  { value: 'no', label: "Sorry, I can't make it" },
                ]}
              />
            </div>

            {invitedEvents.length > 0 && (
              <div className="p-4 bg-surface-subtle/50 border border-border-subtle rounded-xl text-sm">
                <p className="font-semibold mb-1.5 text-base text-gray-900">Your event access details</p>
                <ul className="list-disc list-inside space-y-1.5 text-base text-gray-800">
                  {invitedEvents.map((ev) => <li key={ev}>{ev}</li>)}
                </ul>
              </div>
            )}
            {householdGuests.length > 0 && (
              <div className="text-sm p-4 bg-surface-subtle/50 border border-border-subtle rounded-xl space-y-3">
                <label className="flex items-start gap-3">
                  <input type="checkbox" checked={applyToHousehold} onChange={(e) => onHouseholdToggle(e.target.checked)} className="w-5 h-5 mt-0.5" />
                  <span className="font-semibold text-base text-gray-900">Inherit this RSVP to selected household guests</span>
                </label>

                {applyToHousehold && (
                  <details className="rounded-xl border border-border-subtle bg-white p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-text-primary flex items-center justify-between gap-2">
                      <span>Choose household guests</span>
                      <span className="text-xs text-text-tertiary">{selectedHouseholdGuestIds.length}/{householdGuests.length} selected</span>
                    </summary>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onHouseholdSelectionChange(() => householdGuests.map((h) => h.id))}
                          className="text-xs px-3 py-2 rounded-xl border border-border-subtle text-text-secondary hover:bg-surface-subtle"
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          onClick={() => onHouseholdSelectionChange(() => [])}
                          className="text-xs px-3 py-2 rounded-xl border border-border-subtle text-text-secondary hover:bg-surface-subtle"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {householdGuests.map((h) => {
                          const label = h.first_name && h.last_name ? `${h.first_name} ${h.last_name}` : h.name;
                          const checked = selectedHouseholdGuestIds.includes(h.id);
                          const access = [h.invited_to_ceremony ? 'Ceremony' : null, h.invited_to_reception ? 'Reception' : null].filter(Boolean).join(' + ') || 'No event access';
                          return (
                            <label key={h.id} className="flex items-center justify-between gap-3 bg-white border border-border-subtle rounded-xl px-3 py-2.5">
                              <span className="text-sm text-gray-800 font-medium">{label}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-600">{access}</span>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => onHouseholdSelectionChange((prev) => e.target.checked ? [...new Set([...prev, h.id])] : prev.filter((id) => id !== h.id))}
                                  className="w-5 h-5"
                                />
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </details>
                )}
              </div>
            )}
          </>
        )}

        {formStep === 2 && (
          <>
            {formData.attending && (
              <>
                {(guest.invited_to_ceremony || guest.invited_to_reception) && (
                  <div className="p-4 bg-surface-subtle/50 border border-border-subtle rounded-xl space-y-4">
                    <div className="space-y-1.5">
                      <p className="text-base font-semibold text-gray-900">Which events will you attend?</p>
                      <p className="text-sm text-gray-600">Choose the parts of the celebration you're joining.</p>
                    </div>
                    {guest.invited_to_ceremony && (
                      <label className="flex items-center justify-between gap-4 rounded-xl border border-border-subtle bg-white px-4 py-3 text-sm">
                        <span className="text-base font-medium text-gray-900">Wedding Ceremony</span>
                        <input
                          type="checkbox"
                          checked={formData.attendCeremony}
                          onChange={(e) => onStepDataChange((current) => ({ ...current, attendCeremony: e.target.checked }))}
                          className="w-5 h-5"
                        />
                      </label>
                    )}
                    {guest.invited_to_reception && (
                      <label className="flex items-center justify-between gap-4 rounded-xl border border-border-subtle bg-white px-4 py-3 text-sm">
                        <span className="text-base font-medium text-gray-900">Reception</span>
                        <input
                          type="checkbox"
                          checked={formData.attendReception}
                          onChange={(e) => onStepDataChange((current) => ({ ...current, attendReception: e.target.checked }))}
                          className="w-5 h-5"
                        />
                      </label>
                    )}
                    <p className="text-sm text-gray-600">Your event choices will be saved with your RSVP.</p>
                  </div>
                )}

                {mealConfig.enabled && (
                  <div>
                    <label className="block text-base font-semibold mb-2">Meal choice</label>
                    <Select
                      value={formData.meal_choice}
                      onChange={(e) => onStepDataChange((current) => ({ ...current, meal_choice: e.target.value }))}
                      className="h-12 text-base"
                      options={[
                        { value: '', label: 'Select a meal option' },
                        ...mealConfig.options.map((opt) => ({ value: opt, label: opt })),
                      ]}
                    />
                  </div>
                )}

                {guest.plus_one_allowed && (
                  <div>
                    <label className="block text-base font-semibold mb-2">
                      Plus-one name (optional)
                    </label>
                    <Input
                      type="text"
                      value={formData.plus_one_name}
                      onChange={(e) => onStepDataChange((current) => ({ ...current, plus_one_name: e.target.value }))}
                      placeholder="Plus-one full name"
                      className="h-12 text-base"
                    />
                    <p className="text-sm text-gray-600 mt-2">You're welcome to bring a guest.</p>
                  </div>
                )}

                {allowedChildrenCount > 0 && (
                  <div>
                    <label className="block text-base font-semibold mb-2">
                      Children attending
                    </label>
                    <Select
                      value={String(formData.children_count)}
                      onChange={(e) => onStepDataChange((current) => ({ ...current, children_count: Number(e.target.value) }))}
                      className="h-12 text-base"
                      options={childCountOptions}
                    />
                    <p className="text-sm text-gray-600 mt-2">Your invitation allows up to {allowedChildrenCount} child{allowedChildrenCount === 1 ? '' : 'ren'}.</p>
                  </div>
                )}
              </>
            )}

            {safeMusicPlaylistUrl && (
              <div className="p-4 bg-surface-subtle/50 border border-border-subtle rounded-xl">
                <p className="text-base font-semibold text-text-primary">Song requests</p>
                <p className="text-sm text-text-secondary mt-1.5">Add your song picks directly to our collaborative Spotify playlist.</p>
                <a
                  href={safeMusicPlaylistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center mt-3 px-4 py-3 rounded-xl bg-primary text-white text-base hover:bg-primary-hover"
                >
                  Open Spotify playlist
                </a>
              </div>
            )}

            {rsvpQuestions.length > 0 && (
              <div className="space-y-4 p-4 bg-surface-subtle/50 border border-border-subtle rounded-xl">
                <p className="text-base font-semibold text-gray-900">A few quick questions from the couple</p>
                {rsvpQuestions
                  .filter((q) => (q.appliesTo ?? 'all') === 'all' || ((q.appliesTo === 'ceremony' && formData.attendCeremony) || (q.appliesTo === 'reception' && formData.attendReception)))
                  .map((q) => (
                    <div key={q.id} className="space-y-2">
                      <label className="block text-base font-medium text-gray-900">{getQuestionLabel(q)}{q.required ? ' *' : ''}</label>
                      {q.type === 'long_text' ? (
                        <Textarea
                          value={customAnswers[q.id] ?? ''}
                          onChange={(e) => onStepAnswerChange((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          rows={3}
                          placeholder="Your answer"
                        />
                      ) : (q.type === 'single_choice' || q.type === 'multi_choice') ? (
                        <div className="space-y-2">
                          {(q.options ?? []).map((opt) => {
                            const current = customAnswers[q.id];
                            const checked = q.type === 'multi_choice'
                              ? (Array.isArray(current) ? current.includes(opt) : false)
                              : (current ?? '') === opt;
                            return (
                              <label key={`${q.id}-${opt}`} className="flex items-center gap-3 rounded-xl border border-border-subtle bg-white px-3 py-3 text-sm text-gray-800">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    if (q.type === 'multi_choice') {
                                      onStepAnswerChange((prev) => {
                                        const curr = Array.isArray(prev[q.id]) ? [...(prev[q.id] as string[])] : [];
                                        if (e.target.checked) {
                                          if (!curr.includes(opt)) curr.push(opt);
                                        } else {
                                          const index = curr.indexOf(opt);
                                          if (index >= 0) curr.splice(index, 1);
                                        }
                                        return { ...prev, [q.id]: curr };
                                      });
                                    } else if (e.target.checked) {
                                      onStepAnswerChange((prev) => ({ ...prev, [q.id]: opt }));
                                    } else {
                                      onStepAnswerChange((prev) => ({ ...prev, [q.id]: '' }));
                                    }
                                  }}
                                  className="w-5 h-5"
                                />
                                <span className="text-base text-gray-900">{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <Input
                          type="text"
                          value={customAnswers[q.id] ?? ''}
                          onChange={(e) => onStepAnswerChange((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder="Your answer"
                        />
                      )}
                    </div>
                  ))}
              </div>
            )}

            <div>
              <label className="block text-base font-semibold mb-2">
                Additional notes (optional)
              </label>
              <Textarea
                value={formData.notes}
                onChange={(e) => onStepDataChange((current) => ({ ...current, notes: e.target.value }))}
                placeholder="Dietary restrictions, accessibility needs, or special requests"
                rows={3}
              />
            </div>
          </>
        )}

        {formStep === 3 && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
            {formData.attending && guest.invited_to_ceremony && guest.invited_to_reception && !formData.attendCeremony && !formData.attendReception && (
              <div className="text-sm text-warning bg-warning/10 border border-warning/30 rounded-xl px-3 py-2.5">
                Please review: attending is on, but no events are selected.
              </div>
            )}
            <div className="flex items-center justify-between text-sm gap-4 rounded-xl bg-white px-4 py-3 border border-gray-200">
              <span className="text-gray-700 font-semibold">Attendance</span>
              <span className={`font-semibold px-2.5 py-1 rounded-xl text-xs ${formData.attending ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-700'}`}>
                {formData.attending ? 'Attending' : 'Not attending'}
              </span>
            </div>
            {formData.attending && (guest.invited_to_ceremony || guest.invited_to_reception) && (
              <div className="flex items-center justify-between text-sm gap-4 rounded-xl bg-white px-4 py-3 border border-gray-200">
                <span className="text-gray-700 font-semibold">Events</span>
                <span className="text-gray-900 text-right">{[guest.invited_to_ceremony ? (formData.attendCeremony ? 'Ceremony' : null) : null, guest.invited_to_reception ? (formData.attendReception ? 'Reception' : null) : null].filter(Boolean).join(' + ') || 'None selected'}</span>
              </div>
            )}
            {formData.attending && formData.meal_choice && (
              <div className="flex items-center justify-between text-sm gap-4 rounded-xl bg-white px-4 py-3 border border-gray-200">
                <span className="text-gray-700 font-semibold">Meal</span>
                <span className="text-gray-900 capitalize text-right">{formData.meal_choice}</span>
              </div>
            )}
            {formData.attending && formData.plus_one_name && (
              <div className="flex items-center justify-between text-sm gap-4 rounded-xl bg-white px-4 py-3 border border-gray-200">
                <span className="text-gray-700 font-semibold">Plus one</span>
                <span className="text-gray-900 text-right">{formData.plus_one_name}</span>
              </div>
            )}
            {formData.attending && formData.children_count > 0 && (
              <div className="flex items-center justify-between text-sm gap-4 rounded-xl bg-white px-4 py-3 border border-gray-200">
                <span className="text-gray-700 font-semibold">Children</span>
                <span className="text-gray-900 text-right">{formData.children_count}</span>
              </div>
            )}

            {applyToHousehold && inheritedHouseholdMembers.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-500">Inherited to household</p>
                {inheritedHouseholdMembers.map((h) => {
                  const name = h.first_name && h.last_name ? `${h.first_name} ${h.last_name}` : h.name;
                  const access = [h.invited_to_ceremony ? 'Ceremony' : null, h.invited_to_reception ? 'Reception' : null].filter(Boolean).join(' + ') || 'No event access';
                  return (
                    <div key={h.id} className="flex items-center justify-between text-sm gap-4">
                      <span className="text-gray-600 font-medium">{name}</span>
                      <span className="text-gray-900 text-right">{access}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {rsvpQuestions.length > 0 && Object.keys(customAnswers).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">Custom answers</p>
                {rsvpQuestions.filter((q) => {
                  const value = customAnswers[q.id];
                  return Array.isArray(value) ? value.length > 0 : String(value ?? '').trim().length > 0;
                }).map((q) => (
                  <div key={q.id} className="flex items-start justify-between text-sm gap-4 rounded-xl bg-white px-4 py-3 border border-gray-200">
                    <span className="text-gray-700 font-semibold flex-shrink-0">{getQuestionLabel(q)}</span>
                    <span className="text-gray-900 text-right">{Array.isArray(customAnswers[q.id]) ? (customAnswers[q.id] as string[]).join(', ') : String(customAnswers[q.id] ?? '')}</span>
                  </div>
                ))}
              </div>
            )}
            {formData.notes && (
              <div className="flex items-start justify-between text-sm gap-4 rounded-xl bg-white px-4 py-3 border border-gray-200">
                <span className="text-gray-700 font-semibold flex-shrink-0">Notes</span>
                <span className="text-gray-900 text-right">{formData.notes}</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-4 bg-surface-subtle/50 border border-border-subtle rounded-xl text-text-secondary text-base flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-4 flex-col sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex-1 min-h-[48px] text-base"
            disabled={loading}
          >
            {formStep > 1 ? 'Back' : 'Cancel'}
          </Button>

          {formStep < 3 ? (
            <Button
              type="button"
              onClick={goToNextFormStep}
              className="flex-1 min-h-[48px] text-base"
            >
              {formStep === 1 ? 'Continue to details' : 'Continue to review'}
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={loading || submitting || !canSubmit}
              className="flex-1 min-h-[48px] text-base"
            >
              {loading ? 'Submitting...' : existingRsvp ? 'Update RSVP' : 'Submit RSVP'}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
