import { User } from 'lucide-react';
import { Card } from '../components/ui/Card';
import type { Guest } from './rsvpTypes';

interface RsvpGuestPickerViewProps {
  ambiguousGuests: Guest[];
  guestLabel: (guest: Guest) => string;
  loading: boolean;
  onPickGuest: (guest: Guest) => void;
  onSearchAgain: () => void;
}

export function RsvpGuestPickerView({
  ambiguousGuests,
  guestLabel,
  loading,
  onPickGuest,
  onSearchAgain,
}: RsvpGuestPickerViewProps) {
  return (
    <Card className="p-5 md:p-7">
      <div className="text-center mb-5">
        <h1 className="text-xl md:text-2xl font-serif mb-2">Multiple matches found</h1>
        <p className="text-gray-600 text-sm">
          We found {ambiguousGuests.length} guests with that name. Please select yourself below.
        </p>
      </div>

      <div className="space-y-2.5 mb-5">
        {ambiguousGuests.map((guest) => {
          const hints: string[] = [];
          if (guest.last_name) hints.push(guest.last_name);
          const invitedTo = [
            guest.invited_to_ceremony && 'Ceremony',
            guest.invited_to_reception && 'Reception',
          ].filter(Boolean).join(' + ');

          return (
            <button
              key={guest.id}
              onClick={() => onPickGuest(guest)}
              disabled={loading}
              className="w-full flex items-center gap-3 p-3.5 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center flex-shrink-0 transition-colors">
                <User className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{guestLabel(guest)}</p>
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
        onClick={onSearchAgain}
        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        Search again
      </button>
    </Card>
  );
}
