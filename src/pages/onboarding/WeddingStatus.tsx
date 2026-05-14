import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Button, Card, Input, AddressInput } from '../../components/ui';
import { parseExpectedGuestCount } from '../../lib/weddingStatusGuestCount';
import { clearOnboardingEntryReturnPath } from '../../lib/onboardingEntryCleanup';
import { requireAuthenticatedOnboardingUser, updateWeddingPlanningStatus } from './onboardingService';

type PlanningStatus = 'not_engaged' | 'just_engaged' | 'venue_booked' | 'invitations_sent';

interface StatusDetails {
  not_engaged?: {
    expectedDate?: string;
  };
  just_engaged?: {
    expectedDate?: string;
  };
  venue_booked?: {
    venueName: string;
    venueAddress: string;
    venueDate: string;
    expectedGuestCount: string;
  };
  invitations_sent?: {
    venueName: string;
    venueAddress: string;
    venueDate: string;
    expectedGuestCount: string;
    invitationsSentDate: string;
  };
}

export const WeddingStatus: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<PlanningStatus | null>(null);
  const [details, setDetails] = useState<StatusDetails>({});
  const [isDestinationWedding, setIsDestinationWedding] = useState(false);
  const [venueCoordinates, setVenueCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    clearOnboardingEntryReturnPath();
  }, []);

  const statusOptions = [
    { id: 'not_engaged' as const, label: "We're not engaged yet" },
    { id: 'just_engaged' as const, label: "We just got engaged" },
    { id: 'venue_booked' as const, label: "We've booked our venue" },
    { id: 'invitations_sent' as const, label: "We've sent wedding invitations" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus) {
      setError('Please choose your current wedding planning status.');
      return;
    }

    setError('');

    if (selectedStatus === 'venue_booked') {
      const d = details.venue_booked;
      if (!d?.venueName?.trim() || !d?.venueAddress?.trim() || !d?.venueDate || parseExpectedGuestCount(d?.expectedGuestCount || '') === null) {
        setError('Please complete venue name, address, date, and a valid guest count.');
        return;
      }
    }

    if (selectedStatus === 'invitations_sent') {
      const d = details.invitations_sent;
      if (!d?.venueName?.trim() || !d?.venueAddress?.trim() || !d?.venueDate || parseExpectedGuestCount(d?.expectedGuestCount || '') === null || !d?.invitationsSentDate) {
        setError('Please complete venue details, a valid guest count, and invitations sent date.');
        return;
      }
    }

    setLoading(true);

    try {
      const user = await requireAuthenticatedOnboardingUser();

      const updateData: Record<string, unknown> = {
        planning_status: selectedStatus,
      };

      if (selectedStatus === 'venue_booked' && details.venue_booked) {
        updateData.venue_name = details.venue_booked.venueName;
        updateData.venue_address = details.venue_booked.venueAddress;
        updateData.wedding_date = details.venue_booked.venueDate;
        updateData.venue_date = details.venue_booked.venueDate;
        updateData.expected_guest_count = parseExpectedGuestCount(details.venue_booked.expectedGuestCount);
        updateData.is_destination_wedding = isDestinationWedding;
        if (venueCoordinates) {
          updateData.venue_latitude = venueCoordinates.lat;
          updateData.venue_longitude = venueCoordinates.lng;
        }
      } else if (selectedStatus === 'invitations_sent' && details.invitations_sent) {
        updateData.venue_name = details.invitations_sent.venueName;
        updateData.venue_address = details.invitations_sent.venueAddress;
        updateData.wedding_date = details.invitations_sent.venueDate;
        updateData.venue_date = details.invitations_sent.venueDate;
        updateData.expected_guest_count = parseExpectedGuestCount(details.invitations_sent.expectedGuestCount);
        updateData.invitations_sent_date = details.invitations_sent.invitationsSentDate;
        updateData.is_destination_wedding = isDestinationWedding;
        if (venueCoordinates) {
          updateData.venue_latitude = venueCoordinates.lat;
          updateData.venue_longitude = venueCoordinates.lng;
        }
      }

      await updateWeddingPlanningStatus({ userId: user.id, updateData });

      const weddingDate =
        selectedStatus === 'venue_booked' ? details.venue_booked?.venueDate :
        selectedStatus === 'invitations_sent' ? details.invitations_sent?.venueDate :
        undefined;

      navigate('/onboarding/celebration', {
        state: {
          weddingDate,
        }
      });
    } catch {
      setError('Couldn’t update your status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderDetailsForm = () => {
    if (!selectedStatus) return null;

    if (selectedStatus === 'not_engaged' || selectedStatus === 'just_engaged') {
      return (
        <div className="mt-6 p-6 bg-surface rounded-lg border border-border">
          <p className="text-sm text-text-secondary mb-4">
            {selectedStatus === 'not_engaged'
              ? "No worries! You can start planning and come back to update your details when you're ready."
              : "Congratulations! You can update your venue details later as you progress with planning."}
          </p>
        </div>
      );
    }

    if (selectedStatus === 'venue_booked') {
      return (
        <div className="mt-6 p-6 bg-surface rounded-lg border border-border space-y-4">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Venue Details</h3>

          <div className="flex items-center gap-3 p-4 bg-surface-subtle rounded-lg">
            <input
              type="checkbox"
              id="destination-wedding"
              checked={isDestinationWedding}
              onChange={(e) => setIsDestinationWedding(e.target.checked)}
              className="w-5 h-5 rounded border-border text-primary focus:ring-2 focus:ring-primary"
            />
            <label htmlFor="destination-wedding" className="text-sm font-medium text-text-primary cursor-pointer">
              This is a destination wedding
            </label>
          </div>

          <Input
            label="Venue Name"
            value={details.venue_booked?.venueName || ''}
            onChange={(e) => setDetails({
              ...details,
              venue_booked: {
                venueName: e.target.value,
                venueAddress: details.venue_booked?.venueAddress || '',
                venueDate: details.venue_booked?.venueDate || '',
                expectedGuestCount: details.venue_booked?.expectedGuestCount || ''
              }
            })}
            placeholder="The Grand Ballroom"
            required
          />

          <AddressInput
            label="Venue Address"
            value={details.venue_booked?.venueAddress || ''}
            onChange={(address, coordinates) => {
              setDetails({
                ...details,
                venue_booked: {
                  venueName: details.venue_booked?.venueName || '',
                  venueAddress: address,
                  venueDate: details.venue_booked?.venueDate || '',
                  expectedGuestCount: details.venue_booked?.expectedGuestCount || ''
                }
              });
              if (coordinates) {
                setVenueCoordinates(coordinates);
              }
            }}
            placeholder="Start typing the venue address..."
            required
          />

          <Input
            label="Wedding Date"
            type="date"
            value={details.venue_booked?.venueDate || ''}
            onChange={(e) => setDetails({
              ...details,
              venue_booked: {
                venueName: details.venue_booked?.venueName || '',
                venueAddress: details.venue_booked?.venueAddress || '',
                venueDate: e.target.value,
                expectedGuestCount: details.venue_booked?.expectedGuestCount || ''
              }
            })}
            required
          />

          <Input
            label="Expected Guest Count"
            type="number"
            value={details.venue_booked?.expectedGuestCount || ''}
            onChange={(e) => setDetails({
              ...details,
              venue_booked: {
                venueName: details.venue_booked?.venueName || '',
                venueAddress: details.venue_booked?.venueAddress || '',
                venueDate: details.venue_booked?.venueDate || '',
                expectedGuestCount: e.target.value
              }
            })}
            placeholder="100"
            required
          />
        </div>
      );
    }

    if (selectedStatus === 'invitations_sent') {
      return (
        <div className="mt-6 p-6 bg-surface rounded-lg border border-border space-y-4">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Wedding Details</h3>

          <div className="flex items-center gap-3 p-4 bg-surface-subtle rounded-lg">
            <input
              type="checkbox"
              id="destination-wedding-invites"
              checked={isDestinationWedding}
              onChange={(e) => setIsDestinationWedding(e.target.checked)}
              className="w-5 h-5 rounded border-border text-primary focus:ring-2 focus:ring-primary"
            />
            <label htmlFor="destination-wedding-invites" className="text-sm font-medium text-text-primary cursor-pointer">
              This is a destination wedding
            </label>
          </div>

          <Input
            label="Venue Name"
            value={details.invitations_sent?.venueName || ''}
            onChange={(e) => setDetails({
              ...details,
              invitations_sent: {
                venueName: e.target.value,
                venueAddress: details.invitations_sent?.venueAddress || '',
                venueDate: details.invitations_sent?.venueDate || '',
                expectedGuestCount: details.invitations_sent?.expectedGuestCount || '',
                invitationsSentDate: details.invitations_sent?.invitationsSentDate || ''
              }
            })}
            placeholder="The Grand Ballroom"
            required
          />

          <AddressInput
            label="Venue Address"
            value={details.invitations_sent?.venueAddress || ''}
            onChange={(address, coordinates) => {
              setDetails({
                ...details,
                invitations_sent: {
                  venueName: details.invitations_sent?.venueName || '',
                  venueAddress: address,
                  venueDate: details.invitations_sent?.venueDate || '',
                  expectedGuestCount: details.invitations_sent?.expectedGuestCount || '',
                  invitationsSentDate: details.invitations_sent?.invitationsSentDate || ''
                }
              });
              if (coordinates) {
                setVenueCoordinates(coordinates);
              }
            }}
            placeholder="Start typing the venue address..."
            required
          />

          <Input
            label="Wedding Date"
            type="date"
            value={details.invitations_sent?.venueDate || ''}
            onChange={(e) => setDetails({
              ...details,
              invitations_sent: {
                venueName: details.invitations_sent?.venueName || '',
                venueAddress: details.invitations_sent?.venueAddress || '',
                venueDate: e.target.value,
                expectedGuestCount: details.invitations_sent?.expectedGuestCount || '',
                invitationsSentDate: details.invitations_sent?.invitationsSentDate || ''
              }
            })}
            required
          />

          <Input
            label="Expected Guest Count"
            type="number"
            value={details.invitations_sent?.expectedGuestCount || ''}
            onChange={(e) => setDetails({
              ...details,
              invitations_sent: {
                venueName: details.invitations_sent?.venueName || '',
                venueAddress: details.invitations_sent?.venueAddress || '',
                venueDate: details.invitations_sent?.venueDate || '',
                expectedGuestCount: e.target.value,
                invitationsSentDate: details.invitations_sent?.invitationsSentDate || ''
              }
            })}
            placeholder="100"
            required
          />

          <Input
            label="When did you send invitations?"
            type="date"
            value={details.invitations_sent?.invitationsSentDate || ''}
            onChange={(e) => setDetails({
              ...details,
              invitations_sent: {
                venueName: details.invitations_sent?.venueName || '',
                venueAddress: details.invitations_sent?.venueAddress || '',
                venueDate: details.invitations_sent?.venueDate || '',
                expectedGuestCount: details.invitations_sent?.expectedGuestCount || '',
                invitationsSentDate: e.target.value
              }
            })}
            required
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <Heart className="w-8 h-8 text-primary" aria-hidden="true" />
            <span className="text-2xl font-semibold text-text-primary">dayof</span>
          </div>
          <h1 className="text-3xl font-semibold text-text-primary mb-2">Where are you in the planning?</h1>
          <p className="text-text-secondary">We’ll start from the details that matter right now.</p>
        </div>

        <Card variant="default" padding="lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              {statusOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setSelectedStatus(option.id);
                    setError('');
                  }}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    selectedStatus === option.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-border-hover bg-surface'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedStatus === option.id
                          ? 'border-primary'
                          : 'border-border'
                      }`}
                    >
                      {selectedStatus === option.id && (
                        <div className="w-3 h-3 rounded-sm bg-primary" />
                      )}
                    </div>
                    <span className="text-base font-medium text-text-primary">
                      {option.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {renderDetailsForm()}

            {error && (
              <div className="p-3 bg-surface-secondary border border-border-subtle text-text-secondary rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="accent"
              size="lg"
              fullWidth
              disabled={loading || !selectedStatus}
            >
              {loading ? 'Saving...' : 'Continue to your wedding'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
