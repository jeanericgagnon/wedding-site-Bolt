import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Card } from '../components/ui/Card';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { CheckCircle, Search, AlertCircle, User } from 'lucide-react';

const RSVP_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-rsvp-token`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function rsvpCall(body: object): Promise<{ data?: unknown; error?: string }> {
  const res = await fetch(RSVP_FN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { error: (json as { error?: string })?.error ?? `Error ${res.status}` };
  return { data: json };
}

interface Guest {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  group_name: string | null;
  wedding_site_id: string;
  plus_one_allowed: boolean;
  invited_to_ceremony: boolean;
  invited_to_reception: boolean;
  invite_token: string | null;
}

interface ExistingRSVP {
  id: string;
  attending: boolean;
  meal_choice: string | null;
  plus_one_name: string | null;
  notes: string | null;
}

function maskEmail(email: string | null): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.length > 2 ? local.slice(0, 2) : local.slice(0, 1);
  return `${visible}***@${domain}`;
}

function guestLabel(g: Guest): string {
  if (g.first_name && g.last_name) return `${g.first_name} ${g.last_name}`;
  return g.name || 'Guest';
}


function parseEventSelectionsFromNotes(notes: string | null, guest: Guest): { cleanNotes: string; attendCeremony: boolean; attendReception: boolean } {
  const fallback = {
    cleanNotes: notes || '',
    attendCeremony: !!guest.invited_to_ceremony,
    attendReception: !!guest.invited_to_reception,
  };

  if (!notes) return fallback;

  const match = notes.match(/\[Events\s+([^\]]+)\]/i);
  if (!match) return fallback;

  const eventPart = match[1] || '';
  const map = Object.fromEntries(
    eventPart
      .split(',')
      .map((piece) => piece.trim())
      .map((piece) => {
        const [k, v] = piece.split(':').map((x) => (x || '').trim().toLowerCase());
        return [k, v === 'yes'];
      })
  ) as Record<string, boolean>;

  const cleanNotes = notes.replace(match[0], '').trim();

  return {
    cleanNotes,
    attendCeremony: guest.invited_to_ceremony ? (map['ceremony'] ?? true) : false,
    attendReception: guest.invited_to_reception ? (map['reception'] ?? true) : false,
  };
}

export default function RSVP() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<'search' | 'pick' | 'form' | 'success'>('search');
  const [searchValue, setSearchValue] = useState('');
  const [guest, setGuest] = useState<Guest | null>(null);
  const [ambiguousGuests, setAmbiguousGuests] = useState<Guest[]>([]);
  const [existingRsvp, setExistingRsvp] = useState<ExistingRSVP | null>(null);
  const [rsvpDeadline, setRsvpDeadline] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenAutoLoading, setTokenAutoLoading] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);

  const [formData, setFormData] = useState({
    attending: true,
    attendCeremony: true,
    attendReception: true,
    meal_choice: '',
    plus_one_name: '',
    notes: '',
  });

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) return;
    setTokenAutoLoading(true);
    setSearchValue(token);
    rsvpCall({ action: 'lookup', searchValue: token })
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError(err ?? 'Invalid invitation link. Please search by name below.');
          setTokenAutoLoading(false);
          return;
        }
        const result = data as { guest: Guest | null; existingRsvp: ExistingRSVP | null; guests: Guest[] | null; rsvpDeadline: string | null };
        if (result.guest) {
          selectGuest(result.guest, result.existingRsvp, result.rsvpDeadline);
        } else if (result.guests && result.guests.length > 1) {
          setAmbiguousGuests(result.guests);
          setRsvpDeadline(result.rsvpDeadline);
          setStep('pick');
        } else {
          setError('Invitation not recognized. Please search by name below.');
        }
      })
      .catch(() => setError('Failed to load invitation. Please search by name below.'))
      .finally(() => setTokenAutoLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: err } = await rsvpCall({ action: 'lookup', searchValue: searchValue.trim() });
      if (err) {
        setError(err);
        return;
      }

      const result = data as { guest: Guest | null; existingRsvp: ExistingRSVP | null; guests: Guest[] | null; rsvpDeadline: string | null };

      if (result.guests && result.guests.length > 1) {
        setAmbiguousGuests(result.guests);
        setRsvpDeadline(result.rsvpDeadline);
        setStep('pick');
        return;
      }

      const foundGuest = result.guest!;
      selectGuest(foundGuest, result.existingRsvp, result.rsvpDeadline);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectGuest = (foundGuest: Guest, foundRsvp: ExistingRSVP | null, deadline: string | null = null) => {
    setGuest(foundGuest);
    setRsvpDeadline(deadline);
    if (foundRsvp) {
      setExistingRsvp(foundRsvp);
      const parsed = parseEventSelectionsFromNotes(foundRsvp.notes, foundGuest);
      setFormData({
        attending: foundRsvp.attending,
        attendCeremony: parsed.attendCeremony,
        attendReception: parsed.attendReception,
        meal_choice: foundRsvp.meal_choice || '',
        plus_one_name: foundRsvp.plus_one_name || '',
        notes: parsed.cleanNotes,
      });
    }
    if (!foundRsvp) {
      setFormData(prev => ({
        ...prev,
        attending: true,
        attendCeremony: !!foundGuest.invited_to_ceremony,
        attendReception: !!foundGuest.invited_to_reception,
        meal_choice: '',
        plus_one_name: '',
        notes: '',
      }));
    }
    setFormStep(1);
    setStep('form');
  };

  const handlePickGuest = async (picked: Guest) => {
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await rsvpCall({ action: 'lookup', searchValue: picked.invite_token ?? picked.id });
      if (err || !data) {
        selectGuest(picked, null, rsvpDeadline);
        return;
      }
      const result = data as { guest: Guest | null; existingRsvp: ExistingRSVP | null; guests: Guest[] | null; rsvpDeadline: string | null };
      selectGuest(result.guest ?? picked, result.existingRsvp, result.rsvpDeadline);
    } catch {
      selectGuest(picked, null, rsvpDeadline);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!guest) return;

      if (!guest.invite_token) {
        setError('Your invitation is missing a secure token. Please use the RSVP link from your invitation email.');
        return;
      }

      if (formData.attending && guest.invited_to_ceremony && guest.invited_to_reception && !formData.attendCeremony && !formData.attendReception) {
        setError('Please select at least one event (ceremony or reception), or mark not attending.');
        return;
      }

      const eventSelections: string[] = [];
      if (guest.invited_to_ceremony) eventSelections.push(`Ceremony:${formData.attendCeremony ? 'yes' : 'no'}`);
      if (guest.invited_to_reception) eventSelections.push(`Reception:${formData.attendReception ? 'yes' : 'no'}`);
      const eventTag = eventSelections.length ? `[Events ${eventSelections.join(', ')}]` : '';
      const notesPayload = [formData.notes?.trim() || '', eventTag].filter(Boolean).join('\n').trim();

      const { data, error: err } = await rsvpCall({
        action: 'submit',
        guestId: guest.id,
        inviteToken: guest.invite_token,
        attending: formData.attending,
        mealChoice: formData.meal_choice || null,
        plusOneName: formData.plus_one_name || null,
        notes: notesPayload || null,
      });

      if (err) {
        setError(err);
        return;
      }

      setStep('success');
    } catch {
      setError('Failed to submit RSVP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const guestDisplayName = guest
    ? guest.first_name && guest.last_name
      ? `${guest.first_name} ${guest.last_name}`
      : guest.name
    : '';

  const deadlinePassed = rsvpDeadline ? new Date(rsvpDeadline) < new Date() : false;

  const canSubmit = !!guest?.invite_token && !(deadlinePassed && !existingRsvp);

  const goToNextFormStep = () => {
    if (formStep === 1) {
      if (formData.attending && guest && !guest.invited_to_ceremony && !guest.invited_to_reception) {
        setError('You are marked attending, but no event invitations are enabled for this guest.');
        return;
      }
      setError('');
      setFormStep(2);
      return;
    }

    if (formStep === 2) {
      if (formData.attending && guest?.invited_to_ceremony && guest?.invited_to_reception && !formData.attendCeremony && !formData.attendReception) {
        setError('Please select at least one event before continuing.');
        return;
      }
      if (formData.attending && !formData.meal_choice) {
        setError('Please choose a meal option before review.');
        return;
      }
      setError('');
      setFormStep(3);
    }
  };
  const invitedEvents = [
    guest?.invited_to_ceremony ? 'Ceremony' : null,
    guest?.invited_to_reception ? 'Reception' : null,
  ].filter(Boolean) as string[];

  if (tokenAutoLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Loading your invitation…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50">
      <div className="flex justify-end px-6 pt-4">
        <LanguageSwitcher />
      </div>
      <div className="container mx-auto px-4 pb-16 max-w-2xl">
        {step === 'search' && (
          <Card className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-serif mb-2">{t('rsvp.title')}</h1>
              <p className="text-gray-600">{t('rsvp.subtitle')}</p>
            </div>

            <form onSubmit={handleSearch} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('rsvp.search_label')}
                </label>
                <Input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={t('rsvp.search_placeholder')}
                  required
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Use the invitation code from your email for the fastest lookup
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                  <ul className="pl-6 space-y-1 text-xs text-red-600 list-disc">
                    <li>Make sure you're using the invitation link from your email</li>
                    <li>Try searching by your first and last name</li>
                    <li>Check the spelling matches what the couple has on file</li>
                    <li>Contact the couple if you're still having trouble</li>
                  </ul>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Searching...' : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Find My Invitation
                  </>
                )}
              </Button>
            </form>
          </Card>
        )}

        {step === 'pick' && (
          <Card className="p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-serif mb-2">Multiple matches found</h1>
              <p className="text-gray-600 text-sm">
                We found {ambiguousGuests.length} guests with that name. Please select yourself below.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {ambiguousGuests.map((g) => {
                const hints: string[] = [];
                if (g.last_name) hints.push(g.last_name);
                if (g.group_name) hints.push(g.group_name);
                if (g.email) hints.push(maskEmail(g.email));
                if (g.phone) hints.push(`ends in ${g.phone.slice(-4)}`);
                const invitedTo = [
                  g.invited_to_ceremony && 'Ceremony',
                  g.invited_to_reception && 'Reception',
                ].filter(Boolean).join(' + ');
                return (
                  <button
                    key={g.id}
                    onClick={() => handlePickGuest(g)}
                    disabled={loading}
                    className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-rose-300 hover:bg-rose-50 transition-colors text-left group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-rose-100 flex items-center justify-center flex-shrink-0 transition-colors">
                      <User className="w-5 h-5 text-gray-500 group-hover:text-rose-500 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{guestLabel(g)}</p>
                      {hints.length > 0 && (
                        <p className="text-sm text-gray-500 truncate">{hints.join(' · ')}</p>
                      )}
                      {invitedTo && (
                        <p className="text-xs text-gray-400 mt-0.5">{invitedTo}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => { setStep('search'); setError(''); setAmbiguousGuests([]); }}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Search again
            </button>
          </Card>
        )}

        {step === 'form' && guest && (
          <Card className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-serif mb-2">Welcome, {guestDisplayName}!</h1>
              {existingRsvp && (
                <p className="text-sm text-gray-600">
                  You've already responded. You can update your response below.
                </p>
              )}
            </div>

            {deadlinePassed && !existingRsvp && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">RSVP deadline has passed</p>
                  <p className="mt-0.5">The deadline was {new Date(rsvpDeadline!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Please contact the couple directly.</p>
                </div>
              </div>
            )}

            {deadlinePassed && existingRsvp && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                The RSVP deadline has passed, but you can still update your existing response.
              </div>
            )}

            {!guest.invite_token && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm space-y-1">
                <div className="flex items-start gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Can't submit — missing invitation link
                </div>
                <p className="pl-6">To RSVP, open the invitation email you received and click the RSVP button. That link contains a secure code required to submit your response.</p>
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-center gap-2 text-xs">
                {[1, 2, 3].map((n) => (
                  <div key={n} className={`flex items-center gap-2 ${n < 3 ? 'flex-1' : ''}`}>
                    <div className={`w-6 h-6 rounded-full grid place-items-center font-semibold ${formStep >= n ? 'bg-rose-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{n}</div>
                    {n < 3 && <div className={`h-0.5 flex-1 ${formStep > n ? 'bg-rose-400' : 'bg-gray-200'}`} />}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">{formStep === 1 ? 'Step 1: Attendance' : formStep === 2 ? 'Step 2: Details' : 'Step 3: Final review & submit'} · {Math.round((formStep / 3) * 100)}% complete</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {formStep === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Will you be attending?</label>
                    <Select
                      value={formData.attending ? 'yes' : 'no'}
                      onChange={(e) => setFormData({ ...formData, attending: e.target.value === 'yes' })}
                      required
                      options={[
                        { value: 'yes', label: "Yes, I'll be there!" },
                        { value: 'no', label: "Sorry, I can't make it" },
                      ]}
                    />
                  </div>

                  {invitedEvents.length > 0 && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                      <p className="font-medium mb-1">You're invited to:</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        {invitedEvents.map((ev) => <li key={ev}>{ev}</li>)}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {formStep === 2 && (
                <>
                  {formData.attending && (
                    <>
                      {(guest.invited_to_ceremony || guest.invited_to_reception) && (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg space-y-3">
                          <p className="text-sm font-medium text-gray-800">Which events will you attend?</p>
                          {guest.invited_to_ceremony && (
                            <label className="flex items-center justify-between text-sm">
                              <span>Wedding Ceremony</span>
                              <input
                                type="checkbox"
                                checked={formData.attendCeremony}
                                onChange={(e) => setFormData({ ...formData, attendCeremony: e.target.checked })}
                                className="w-4 h-4"
                              />
                            </label>
                          )}
                          {guest.invited_to_reception && (
                            <label className="flex items-center justify-between text-sm">
                              <span>Reception</span>
                              <input
                                type="checkbox"
                                checked={formData.attendReception}
                                onChange={(e) => setFormData({ ...formData, attendReception: e.target.checked })}
                                className="w-4 h-4"
                              />
                            </label>
                          )}
                          <p className="text-xs text-gray-500">Event choices are saved with your RSVP details.</p>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium mb-2">Meal Choice</label>
                        <Select
                          value={formData.meal_choice}
                          onChange={(e) => setFormData({ ...formData, meal_choice: e.target.value })}
                          options={[
                            { value: '', label: 'Select a meal option' },
                            { value: 'chicken', label: 'Chicken' },
                            { value: 'beef', label: 'Beef' },
                            { value: 'fish', label: 'Fish' },
                            { value: 'vegetarian', label: 'Vegetarian' },
                            { value: 'vegan', label: 'Vegan' },
                          ]}
                        />
                      </div>

                      {guest.plus_one_allowed && (
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Plus One Name (Optional)
                          </label>
                          <Input
                            type="text"
                            value={formData.plus_one_name}
                            onChange={(e) => setFormData({ ...formData, plus_one_name: e.target.value })}
                            placeholder="Guest's full name"
                          />
                          <p className="text-xs text-gray-500 mt-1">You're welcome to bring a guest</p>
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Additional Notes (Optional)
                    </label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Dietary restrictions, accessibility needs, or special requests"
                      rows={3}
                    />
                  </div>
                </>
              )}

              {formStep === 3 && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
                  {formData.attending && guest?.invited_to_ceremony && guest?.invited_to_reception && !formData.attendCeremony && !formData.attendReception && (
                    <div className="text-xs text-warning bg-warning/10 border border-warning/30 rounded-lg px-3 py-2">
                      Please review: attending is on, but no events are selected.
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">Attendance</span>
                    <span className={`font-semibold px-2.5 py-1 rounded-full text-xs ${formData.attending ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {formData.attending ? 'Attending' : 'Not attending'}
                    </span>
                  </div>
                  {formData.attending && (guest.invited_to_ceremony || guest.invited_to_reception) && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 font-medium">Events</span>
                      <span className="text-gray-900">{[guest.invited_to_ceremony ? (formData.attendCeremony ? 'Ceremony' : null) : null, guest.invited_to_reception ? (formData.attendReception ? 'Reception' : null) : null].filter(Boolean).join(' + ') || 'None selected'}</span>
                    </div>
                  )}
                  {formData.attending && formData.meal_choice && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 font-medium">Meal</span>
                      <span className="text-gray-900 capitalize">{formData.meal_choice}</span>
                    </div>
                  )}
                  {formData.attending && formData.plus_one_name && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 font-medium">Plus one</span>
                      <span className="text-gray-900">{formData.plus_one_name}</span>
                    </div>
                  )}
                  {formData.notes && (
                    <div className="flex items-start justify-between text-sm gap-4">
                      <span className="text-gray-600 font-medium flex-shrink-0">Notes</span>
                      <span className="text-gray-900 text-right">{formData.notes}</span>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (formStep > 1) {
                      setFormStep((formStep - 1) as 1 | 2 | 3);
                    } else {
                      setStep('search');
                      setError('');
                    }
                  }}
                  className="flex-1"
                >
                  {formStep > 1 ? 'Back' : 'Cancel'}
                </Button>

                {formStep < 3 ? (
                  <Button
                    type="button"
                    onClick={goToNextFormStep}
                    className="flex-1"
                  >
                    {formStep === 1 ? 'Continue to details' : 'Continue to review'}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading || !canSubmit}
                    className="flex-1"
                  >
                    {loading ? 'Submitting...' : existingRsvp ? 'Update RSVP' : 'Submit RSVP'}
                  </Button>
                )}
              </div>
            </form>
          </Card>
        )}

        {step === 'success' && (
          <Card className="p-8">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${formData.attending ? 'bg-green-100' : 'bg-neutral-100'}`}>
                  <CheckCircle className={`w-9 h-9 ${formData.attending ? 'text-green-500' : 'text-neutral-500'}`} />
                </div>
              </div>
              <h1 className="text-3xl font-serif mb-2">
                {formData.attending ? "You're confirmed!" : "Response recorded"}
              </h1>
              <p className="text-gray-500 text-sm">
                {guestDisplayName && `For ${guestDisplayName}`}
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 font-medium">Attendance</span>
                <span className={`font-semibold px-2.5 py-1 rounded-full text-xs ${
                  formData.attending
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {formData.attending ? "Attending" : "Not attending"}
                </span>
              </div>
              {formData.attending && formData.meal_choice && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 font-medium">Meal</span>
                  <span className="text-gray-900 capitalize">{formData.meal_choice}</span>
                </div>
              )}
              {formData.attending && formData.plus_one_name && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 font-medium">Plus one</span>
                  <span className="text-gray-900">{formData.plus_one_name}</span>
                </div>
              )}
              {formData.notes && (
                <div className="flex items-start justify-between text-sm gap-4">
                  <span className="text-gray-600 font-medium flex-shrink-0">Notes</span>
                  <span className="text-gray-900 text-right">{formData.notes}</span>
                </div>
              )}
            </div>

            {formData.attending && (
              <p className="text-center text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg py-3 px-4 mb-6">
                We can't wait to celebrate with you!
              </p>
            )}
            {!formData.attending && (
              <p className="text-center text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 mb-6">
                We'll miss you, but thank you for letting us know.
              </p>
            )}

            <Button
              variant="outline"
              onClick={() => {
                setStep('search');
                setSearchValue('');
                setGuest(null);
                setExistingRsvp(null);
                setAmbiguousGuests([]);
                setRsvpDeadline(null);
                setFormData({ attending: true, attendCeremony: true, attendReception: true, meal_choice: '', plus_one_name: '', notes: '' });
                setFormStep(1);
              }}
              className="w-full"
            >
              Submit Another RSVP
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
