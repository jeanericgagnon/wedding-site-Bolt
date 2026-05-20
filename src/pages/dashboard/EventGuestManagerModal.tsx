import { useCallback, useEffect, useRef, useState } from 'react';
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
  const eventGuestManagerContextVersionRef = useRef(0);
  const pendingConfirmationResolveRef = useRef<((confirmed: boolean) => void) | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<null | Omit<ConfirmDialogProps, 'open'>>(null);
  const requestConfirmation = (options: Pick<ConfirmDialogProps, 'title' | 'description' | 'confirmLabel' | 'tone'>) =>
    new Promise<boolean>((resolve) => {
      pendingConfirmationResolveRef.current?.(false);
      pendingConfirmationResolveRef.current = resolve;
      setConfirmDialog({
        ...options,
        onCancel: () => {
          pendingConfirmationResolveRef.current = null;
          setConfirmDialog(null);
          resolve(false);
        },
        onConfirm: () => {
          pendingConfirmationResolveRef.current = null;
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

  const resetEventGuestManagerState = useCallback(() => {
    pendingConfirmationResolveRef.current?.(false);
    pendingConfirmationResolveRef.current = null;
    setConfirmDialog(null);
    setAllGuests([]);
    setInvitedGuestIds(new Set());
    setLoading(true);
    setBulkLoading(false);
    setSearchQuery('');
  }, []);

  useEffect(() => {
    const contextVersion = ++eventGuestManagerContextVersionRef.current;
    resetEventGuestManagerState();
    void loadGuests(eventId, contextVersion);
    return () => {
      eventGuestManagerContextVersionRef.current += 1;
      resetEventGuestManagerState();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, resetEventGuestManagerState]);

  function isCurrentEventGuestManagerContext(contextVersion: number) {
    return contextVersion === eventGuestManagerContextVersionRef.current;
  }

  async function loadGuests(targetEventId: string, contextVersion: number) {
    try {
      const snapshot = await loadItineraryEventGuestManagerSnapshot(targetEventId);
      if (!isCurrentEventGuestManagerContext(contextVersion)) return;
      setAllGuests(snapshot.guests);
      setInvitedGuestIds(snapshot.invitedGuestIds);
    } catch {
      if (!isCurrentEventGuestManagerContext(contextVersion)) return;
      setAllGuests([]);
      setInvitedGuestIds(new Set());
      toast('Couldn’t load this event’s guest list. Please try again.', 'error');
    } finally {
      if (isCurrentEventGuestManagerContext(contextVersion)) {
        setLoading(false);
      }
    }
  }

  async function toggleGuestInvitation(guestId: string) {
    const contextVersion = eventGuestManagerContextVersionRef.current;
    const targetEventId = eventId;
    try {
      if (invitedGuestIds.has(guestId)) {
        await removeItineraryEventGuestInvitation(targetEventId, guestId);
        if (!isCurrentEventGuestManagerContext(contextVersion)) return;
        setInvitedGuestIds((prev) => {
          const next = new Set(prev);
          next.delete(guestId);
          return next;
        });
      } else {
        await addItineraryEventGuestInvitation(targetEventId, guestId);
        if (!isCurrentEventGuestManagerContext(contextVersion)) return;
        setInvitedGuestIds((prev) => new Set(prev).add(guestId));
      }

      onUpdate();
    } catch {
      if (!isCurrentEventGuestManagerContext(contextVersion)) return;
      toast('Couldn’t update invitation. Please try again.', 'error');
    }
  }

  async function inviteAll() {
    const contextVersion = eventGuestManagerContextVersionRef.current;
    const targetEventId = eventId;
    setBulkLoading(true);
    try {
      const uninvited = allGuests.filter((guest) => !invitedGuestIds.has(guest.id));
      if (uninvited.length === 0) return;

      await inviteAllGuestsToItineraryEvent(targetEventId, uninvited.map((guest) => guest.id));
      if (!isCurrentEventGuestManagerContext(contextVersion)) return;

      setInvitedGuestIds(new Set(allGuests.map((guest) => guest.id)));
      onUpdate();
    } catch {
      if (!isCurrentEventGuestManagerContext(contextVersion)) return;
      toast('Couldn’t invite all guests. Please try again.', 'error');
    } finally {
      if (isCurrentEventGuestManagerContext(contextVersion)) {
        setBulkLoading(false);
      }
    }
  }

  async function removeAll() {
    const contextVersion = eventGuestManagerContextVersionRef.current;
    const targetEventId = eventId;
    const confirmed = await requestConfirmation({
      title: 'Remove all guests from this event?',
      description: 'This removes every invitation for this itinerary event. If something does not finish, the guest responses are kept safe.',
      confirmLabel: 'Remove all',
      tone: 'danger',
    });
    if (!isCurrentEventGuestManagerContext(contextVersion)) return;
    if (!confirmed) return;
    setBulkLoading(true);
    try {
      await removeAllGuestsFromItineraryEvent(targetEventId);
      if (!isCurrentEventGuestManagerContext(contextVersion)) return;
      setInvitedGuestIds(new Set());
      onUpdate();
    } catch {
      if (!isCurrentEventGuestManagerContext(contextVersion)) return;
      toast('Couldn’t remove all guests. Please try again.', 'error');
    } finally {
      if (isCurrentEventGuestManagerContext(contextVersion)) {
        setBulkLoading(false);
      }
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
              className="flex-1 rounded-xl border border-border-subtle px-3 py-2 text-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={inviteAll}
              disabled={bulkLoading || invitedCount === totalCount}
              className="rounded-xl border border-border-subtle bg-surface-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              Invite all
            </button>
            <button
              onClick={removeAll}
              disabled={bulkLoading || invitedCount === 0}
              className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
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
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-colors ${
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
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
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
