import { CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

interface HouseholdGuestSummary {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string;
  invited_to_ceremony?: boolean;
  invited_to_reception?: boolean;
}

interface RsvpSuccessFormData {
  attending: boolean;
  attendCeremony: boolean;
  attendReception: boolean;
  meal_choice: string;
  plus_one_name: string;
  children_count: number;
  notes: string;
}

interface RsvpSuccessViewProps {
  applyToHousehold: boolean;
  formData: RsvpSuccessFormData;
  guestDisplayName: string;
  guestInvitedToCeremony: boolean;
  guestInvitedToReception: boolean;
  guestPresent: boolean;
  inheritedHouseholdMembers: HouseholdGuestSummary[];
  onDone: () => void;
  onSubmitAnother: () => void;
}

export function RsvpSuccessView({
  applyToHousehold,
  formData,
  guestDisplayName,
  guestInvitedToCeremony,
  guestInvitedToReception,
  guestPresent: _guestPresent,
  inheritedHouseholdMembers,
  onDone,
  onSubmitAnother,
}: RsvpSuccessViewProps) {
  return (
    <Card className="p-5 md:p-7">
      <div className="text-center mb-5">
        <div className="flex justify-center mb-3.5">
          <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${formData.attending ? 'bg-primary/10' : 'bg-neutral-100'}`}>
            <CheckCircle className={`w-9 h-9 ${formData.attending ? 'text-primary' : 'text-neutral-500'}`} />
          </div>
        </div>
        <h1 className="text-2xl md:text-3xl font-serif mb-1.5">
          {formData.attending ? "You're confirmed!" : "Response recorded"}
        </h1>
        <p className="text-gray-500 text-sm">
          {guestDisplayName && `For ${guestDisplayName}`}
        </p>
      </div>

      <details className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-5">
        <summary className="cursor-pointer text-sm font-semibold text-gray-800 flex items-center justify-between">
          RSVP summary
          <span className="text-xs text-gray-500">View details</span>
        </summary>
        <div className="mt-2.5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 font-medium">Attendance</span>
            <span className={`font-semibold px-2.5 py-1 rounded-lg text-xs ${
              formData.attending
                ? 'bg-primary/10 text-primary'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {formData.attending ? 'Attending' : 'Not attending'}
            </span>
          </div>
          {formData.attending && formData.meal_choice && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 font-medium">Meal</span>
              <span className="text-gray-900 capitalize">{formData.meal_choice}</span>
            </div>
          )}
          {formData.attending && (guestInvitedToCeremony || guestInvitedToReception) && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 font-medium">Events</span>
              <span className="text-gray-900">{[
                guestInvitedToCeremony ? (formData.attendCeremony ? 'Ceremony' : null) : null,
                guestInvitedToReception ? (formData.attendReception ? 'Reception' : null) : null,
              ].filter(Boolean).join(' + ') || 'None selected'}</span>
            </div>
          )}
          {formData.attending && formData.plus_one_name && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 font-medium">Plus one</span>
              <span className="text-gray-900">{formData.plus_one_name}</span>
            </div>
          )}
          {formData.attending && formData.children_count > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 font-medium">Children</span>
              <span className="text-gray-900">{formData.children_count}</span>
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
          {formData.notes && (
            <div className="flex items-start justify-between text-sm gap-4">
              <span className="text-gray-600 font-medium flex-shrink-0">Notes</span>
              <span className="text-gray-900 text-right">{formData.notes}</span>
            </div>
          )}
        </div>
      </details>

      {formData.attending && (
        <p className="text-center text-sm text-text-primary bg-surface-subtle border border-border-subtle rounded-lg py-3 px-4 mb-5">
          We can't wait to celebrate with you!
        </p>
      )}
      {!formData.attending && (
        <p className="text-center text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 mb-5">
          We'll miss you, but thank you for letting us know.
        </p>
      )}

      <div className="space-y-1.5">
        <Button
          onClick={onDone}
          className="w-full h-11"
        >
          Done
        </Button>
        <button
          onClick={onSubmitAnother}
          className="w-full text-sm text-gray-500 hover:text-gray-700"
        >
          Submit another RSVP
        </button>
      </div>
    </Card>
  );
}
