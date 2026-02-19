import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Card } from '../components/ui/Card';
import { CheckCircle, Search, AlertCircle } from 'lucide-react';
import { sendRsvpNotification, sendRsvpConfirmation } from '../lib/emailService';

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

interface SiteData {
  coupleEmail: string | null;
  coupleName1: string;
  coupleName2: string;
  weddingDate: string | null;
  venueName: string | null;
}

export default function RSVP() {
  const [step, setStep] = useState<'search' | 'form' | 'success'>('search');
  const [searchValue, setSearchValue] = useState('');
  const [guest, setGuest] = useState<Guest | null>(null);
  const [existingRsvp, setExistingRsvp] = useState<ExistingRSVP | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    attending: true,
    meal_choice: '',
    plus_one_name: '',
    notes: '',
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: err } = await rsvpCall({ action: 'lookup', searchValue: searchValue.trim() });
      if (err) {
        setError(err === 'Guest not found. Please check your name or invitation code.'
          ? err
          : 'An error occurred. Please try again.');
        return;
      }

      const { guest: foundGuest, existingRsvp: foundRsvp } = data as { guest: Guest; existingRsvp: ExistingRSVP | null };
      setGuest(foundGuest);

      if (foundRsvp) {
        setExistingRsvp(foundRsvp);
        setFormData({
          attending: foundRsvp.attending,
          meal_choice: foundRsvp.meal_choice || '',
          plus_one_name: foundRsvp.plus_one_name || '',
          notes: foundRsvp.notes || '',
        });
      }

      setStep('form');
    } catch {
      setError('An error occurred. Please try again.');
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

      const { data, error: err } = await rsvpCall({
        action: 'submit',
        guestId: guest.id,
        inviteToken: guest.invite_token,
        attending: formData.attending,
        mealChoice: formData.meal_choice || null,
        plusOneName: formData.plus_one_name || null,
        notes: formData.notes || null,
      });

      if (err) {
        setError(err);
        return;
      }

      const result = data as { success: boolean; siteData: SiteData | null; guestName: string; guestEmail: string | null };

      if (result.siteData) {
        const { siteData, guestName, guestEmail } = result;

        if (siteData.coupleEmail) {
          sendRsvpNotification({
            coupleEmail: siteData.coupleEmail,
            guestName,
            attending: formData.attending,
            mealChoice: formData.meal_choice || null,
            plusOneName: formData.plus_one_name || null,
            notes: formData.notes || null,
            coupleName1: siteData.coupleName1,
            coupleName2: siteData.coupleName2,
          }).catch(console.error);
        }

        if (guestEmail) {
          sendRsvpConfirmation({
            guestEmail,
            guestName,
            attending: formData.attending,
            coupleName1: siteData.coupleName1,
            coupleName2: siteData.coupleName2,
            weddingDate: siteData.weddingDate,
            venueName: siteData.venueName,
          }).catch(console.error);
        }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50">
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        {step === 'search' && (
          <Card className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-serif mb-2">RSVP</h1>
              <p className="text-gray-600">Please let us know if you can attend</p>
            </div>

            <form onSubmit={handleSearch} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Enter your name or invitation code
                </label>
                <Input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="John Smith or ABC123"
                  required
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {error}
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

            {!guest.invite_token && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                Your invitation is missing a secure token. Please use the RSVP link from your invitation email to submit your response.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
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

              {formData.attending && (
                <>
                  {(guest.invited_to_ceremony || guest.invited_to_reception) && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                      <p className="font-medium mb-1">You're invited to:</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        {guest.invited_to_ceremony && <li>Wedding Ceremony</li>}
                        {guest.invited_to_reception && <li>Reception</li>}
                      </ul>
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
                  onClick={() => { setStep('search'); setError(''); }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !guest.invite_token}
                  className="flex-1"
                >
                  {loading ? 'Submitting...' : existingRsvp ? 'Update RSVP' : 'Submit RSVP'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {step === 'success' && (
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-6">
              <CheckCircle className="w-20 h-20 text-green-500" />
            </div>
            <h1 className="text-3xl font-serif mb-4">Thank You!</h1>
            <p className="text-gray-600 mb-6">
              {formData.attending
                ? "We're so excited to celebrate with you!"
                : "We'll miss you, but we understand. Thank you for letting us know."}
            </p>
            <Button
              onClick={() => {
                setStep('search');
                setSearchValue('');
                setGuest(null);
                setExistingRsvp(null);
                setFormData({ attending: true, meal_choice: '', plus_one_name: '', notes: '' });
              }}
            >
              Submit Another RSVP
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
