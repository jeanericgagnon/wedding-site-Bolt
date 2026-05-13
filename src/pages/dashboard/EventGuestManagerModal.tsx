import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog, type ConfirmDialogProps } from '../../components/ui/ConfirmDialog';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../components/ui/Toast';
import {
  addItineraryEventGuestInvitation,
  inviteAllGuestsToItineraryEvent,
  loadItineraryEventGuestManagerSnapshot,
  removeAllGuestsFromItineraryEvent,
  removeItineraryEventGuestInvitation,
  type ItineraryGuestPickerRow,
} from './itineraryService';

interface EventGuestManagerModalProps {
  eventId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function EventGuestManagerModal({ eventId, onClose, onUpdate }: EventGuestManagerModalProps) {
  const { toast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<null | Omit<ConfirmDialogProps, 'open'>>(null);
  const requestConfirmation = (options: Pick<ConfirmDialogProps, 'title' | 'description' | 'confirmLabel' | 'tone'>) =>
    new Promise<boolean>((resolve) => {
      setConfirmDialog({
        ...options,
        onCancel: () => {
          setConfirmDialog(null);
          resolve(false);
        },
        onConfirm: () => {
          setConfirmDialog(null);
          resolve(true);
        },
      });
    });
  const [allGuests, setAllGuests] = useState<ItineraryGuestPickerRow[]>([]);
  const [invitedGuestIds, setInvitedGuestIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    void loadGuests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function loadGuests() {
    try {
      const snapshot = await loadItineraryEventGuestManagerSnapshot(eventId);
      setAllGuests(snapshot.guests);
      setInvitedGuestIds(snapshot.invitedGuestIds);
    } catch {
      setAllGuests([]);
      setInvitedGuestIds(new Set());
      toast('Couldn’t load this event’s guest list. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function toggleGuestInvitation(guestId: string) {
    try {
      if (invitedGuestIds.has(guestId)) {
        await removeItineraryEventGuestInvitation(eventId, guestId);
        setInvitedGuestIds((prev) => {
          const next = new Set(prev);
          next.delete(guestId);
          return next;
        });
      } else {
        await addItineraryEventGuestInvitation(eventId, guestId);
        setInvitedGuestIds((prev) => new Set(prev).add(guestId));
      }

      onUpdate();
    } catch {
      toast('Couldn’t update invitation. Please try again.', 'error');
    }
  }

  async function inviteAll() {
    setBulkLoading(true);
    try {
      const uninvited = allGuests.filter((guest) => !invitedGuestIds.has(guest.id));
      if (uninvited.length === 0) return;

      await inviteAllGuestsToItineraryEvent(eventId, uninvited.map((guest) => guest.id));

      setInvitedGuestIds(new Set(allGuests.map((guest) => guest.id)));
      onUpdate();
    } catch {
      toast('Couldn’t invite all guests. Please try again.', 'error');
    } finally {
      setBulkLoading(false);
    }
  }

  async function removeAll() {
    const confirmed = await requestConfirmation({
      title: 'Remove all guests from this event?',
      description: 'This removes every invitation for this itinerary event. If something does not finish, the guest responses are kept safe.',
      confirmLabel: 'Remove all',
      tone: 'danger',
    });
    if (!confirmed) return;
    setBulkLoading(true);
    try {
      await removeAllGuestsFromItineraryEvent(eventId);
      setInvitedGuestIds(new Set());
      onUpdate();
    } catch {
      toast('Couldn’t remove all guests. Please try again.', 'error');
    } finally {
      setBulkLoading(false);
    }
  }

  const filteredGuests = allGuests.filter((guest) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (guest.name || `${guest.first_name || ''} ${guest.last_name || ''}`).toLowerCase();
    return name.includes(q) || (guest.email || '').toLowerCase().includes(q);
  });

  const invitedCount = invitedGuestIds.size;
  const totalCount = allGuests.length;

  return (
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4">
      <Card className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden border border-border-subtle bg-white">
        <div className="border-b border-border-subtle p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-semibold text-neutral-900">Manage event guests</h2>
            <span className="text-sm text-neutral-500">{invitedCount} of {totalCount} invited</span>
          </div>
          <p className="text-sm text-neutral-600">
            Choose which guests should see and answer for this event.
          </p>
          <div className="flex items-center gap-2 mt-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guests"
              className="flex-1 px-3 py-2 text-sm border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
            />
            <button
              onClick={inviteAll}
              disabled={bulkLoading || invitedCount === totalCount}
              className="px-3 py-2 text-sm font-medium bg-surface-subtle text-text-primary border border-border-subtle rounded-lg hover:bg-primary-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Invite all
            </button>
            <button
              onClick={removeAll}
              disabled={bulkLoading || invitedCount === 0}
              className="px-3 py-2 text-sm font-medium bg-neutral-50 text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Remove all
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : allGuests.length === 0 ? (
            <p className="text-center text-neutral-600 py-8">
              No guests found. Add guests first in the Guests page.
            </p>
          ) : filteredGuests.length === 0 ? (
            <p className="text-center text-neutral-500 py-8 text-sm">No guests match your search.</p>
          ) : (
            <div className="space-y-2">
              {filteredGuests.map((guest) => {
                const isInvited = invitedGuestIds.has(guest.id);
                return (
                  <div
                    key={guest.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                      isInvited
                        ? 'bg-surface-subtle border-border-subtle'
                        : 'border-border-subtle hover:bg-surface-subtle/50'
                    }`}
                    onClick={() => void toggleGuestInvitation(guest.id)}
                  >
                    <div>
                      <p className="font-medium text-neutral-900">{guest.name || `${guest.first_name || ''} ${guest.last_name || ''}`.trim()}</p>
                      {guest.email && <p className="text-sm text-neutral-500">{guest.email}</p>}
                    </div>
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isInvited
                          ? 'bg-surface text-text-primary border border-border-subtle'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {isInvited ? (
                        <><Check className="w-3.5 h-3.5" /> Invited</>
                      ) : (
                        <>Invite</>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border-subtle">
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </Card>
      {confirmDialog && (
        <ConfirmDialog
          open
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          tone={confirmDialog.tone}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
    </div>
  );
}
