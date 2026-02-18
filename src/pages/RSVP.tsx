import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Card } from '../components/ui/Card';
import { CheckCircle, Search } from 'lucide-react';

interface Guest {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string;
  plus_one_allowed: boolean;
  invited_to_ceremony: boolean;
  invited_to_reception: boolean;
}

interface ExistingRSVP {
  id: string;
  attending: boolean;
  meal_choice: string | null;
  plus_one_name: string | null;
  notes: string | null;
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
      // Try to find guest by invite token first
      const { data: tokenResult, error: guestError } = await supabase
        .from('guests')
        .select('*')
        .eq('invite_token', searchValue)
        .maybeSingle();
      let guestData = tokenResult;

      // If not found by token, search by name
      if (!guestData) {
        const searchTerm = searchValue.toLowerCase();
        const { data: allGuests, error: nameError } = await supabase
          .from('guests')
          .select('*')
          .or(`name.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`);

        if (nameError) throw nameError;

        if (allGuests && allGuests.length > 0) {
          guestData = allGuests[0];
        }
      }

      if (guestError && guestError.code !== 'PGRST116') throw guestError;

      if (!guestData) {
        setError('Guest not found. Please check your name or invitation code.');
        setLoading(false);
        return;
      }

      setGuest(guestData);

      // Check if RSVP already exists
      const { data: rsvpData } = await supabase
        .from('rsvps')
        .select('*')
        .eq('guest_id', guestData.id)
        .maybeSingle();

      if (rsvpData) {
        setExistingRsvp(rsvpData);
        setFormData({
          attending: rsvpData.attending,
          meal_choice: rsvpData.meal_choice || '',
          plus_one_name: rsvpData.plus_one_name || '',
          notes: rsvpData.notes || '',
        });
      }

      setStep('form');
    } catch (err) {
      console.error('Error finding guest:', err);
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

      const rsvpPayload = {
        guest_id: guest.id,
        attending: formData.attending,
        meal_choice: formData.meal_choice || null,
        plus_one_name: formData.plus_one_name || null,
        notes: formData.notes || null,
        responded_at: new Date().toISOString(),
      };

      if (existingRsvp) {
        // Update existing RSVP
        const { error: updateError } = await supabase
          .from('rsvps')
          .update(rsvpPayload)
          .eq('id', existingRsvp.id);

        if (updateError) throw updateError;
      } else {
        // Create new RSVP
        const { error: insertError } = await supabase
          .from('rsvps')
          .insert([rsvpPayload]);

        if (insertError) throw insertError;
      }

      // Update guest record
      await supabase
        .from('guests')
        .update({
          rsvp_status: formData.attending ? 'confirmed' : 'declined',
          rsvp_received_at: new Date().toISOString(),
        })
        .eq('id', guest.id);

      setStep('success');
    } catch (err) {
      console.error('Error submitting RSVP:', err);
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
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  'Searching...'
                ) : (
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

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Will you be attending?
                </label>
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
                    <label className="block text-sm font-medium mb-2">
                      Meal Choice
                    </label>
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
                      <p className="text-xs text-gray-500 mt-1">
                        You're welcome to bring a guest
                      </p>
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
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('search')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
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
                setFormData({
                  attending: true,
                  meal_choice: '',
                  plus_one_name: '',
                  notes: '',
                });
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
