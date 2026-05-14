import { useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';
import { demoEvents, demoGuests, demoWeddingSite } from '../../../lib/demoData';
import type { PlannerAccessRole, PlannerPermissionKey } from '../../../lib/plannerAccess';
import { formatMessageEventOptionLabel } from '../messageEventDate';
import type { AudienceOption, DeliveryRow, Guest, Message, SmsCreditTransaction, WeddingSite } from './messageDashboardTypes';
import { readDemoMessages } from './messageDemoStorage';
import {
  isMissingMessageDeliveriesTable,
  loadDashboardMessages,
  loadMessageDeliveries,
  loadMessageGuests,
  loadMessageItineraryAudience,
  loadMessagesActiveSite,
  loadSmsCreditPreview,
} from './messageService';

// Optional table: can be missing in lean deployments.
// Start unknown, then permanently disable after one confirmed missing-table miss.
let hasMessageDeliveriesTable: boolean | null = null;

type ToastFn = (message: string, tone?: 'success' | 'error' | 'info') => void;
type SetState<T> = Dispatch<SetStateAction<T>>;

export type UseMessageDashboardDataArgs = {
  userId: string | null;
  isDemoMode: boolean;
  viewingMessage: Message | null;
  messages: Message[];
  weddingSite: WeddingSite | null;
  toast: ToastFn;
  setWeddingSite: SetState<WeddingSite | null>;
  setMessages: SetState<Message[]>;
  setDeliveries: SetState<DeliveryRow[]>;
  setGuests: SetState<Guest[]>;
  setLoading: SetState<boolean>;
  setSmsTransactions: SetState<SmsCreditTransaction[]>;
  setSmsExpiringSoon: SetState<number>;
  setItineraryAudienceOptions: SetState<AudienceOption[]>;
  setEventGuestIds: SetState<Record<string, Set<string>>>;
  setMessagesRole: SetState<PlannerAccessRole>;
  setActiveSiteRole: SetState<PlannerAccessRole>;
  setMessagesPermissions: SetState<PlannerPermissionKey[] | null>;
};

export function useMessageDashboardData({
  userId,
  isDemoMode,
  viewingMessage,
  messages,
  weddingSite,
  toast,
  setWeddingSite,
  setMessages,
  setDeliveries,
  setGuests,
  setLoading,
  setSmsTransactions,
  setSmsExpiringSoon,
  setItineraryAudienceOptions,
  setEventGuestIds,
  setMessagesRole,
  setActiveSiteRole,
  setMessagesPermissions,
}: UseMessageDashboardDataArgs) {
  const fetchWeddingSite = useCallback(async () => {
    if (isDemoMode) {
      setWeddingSite({
        id: demoWeddingSite.id,
        default_language: (demoWeddingSite as any).default_language ?? 'en',
        couple_first_name: (demoWeddingSite as any).couple_first_name ?? (demoWeddingSite as any).couple_name_1 ?? null,
        couple_second_name: (demoWeddingSite as any).couple_second_name ?? (demoWeddingSite as any).couple_name_2 ?? null,
        couple_email: (demoWeddingSite as any).couple_email ?? null,
        sms_credits_balance: 250,
      });
      return;
    }

    if (!userId) {
      setWeddingSite(null);
      setMessages([]);
      setDeliveries([]);
      setGuests([]);
      setSmsTransactions([]);
      setSmsExpiringSoon(0);
      setItineraryAudienceOptions([]);
      setEventGuestIds({});
      setLoading(false);
      return;
    }

    try {
      const { activeSite, weddingSite: loadedWeddingSite } = await loadMessagesActiveSite(userId);
      setActiveSiteRole(activeSite?.role ?? 'owner');
      setMessagesRole(activeSite?.role ?? 'owner');
      setMessagesPermissions(activeSite?.permissions ?? null);
      if (loadedWeddingSite) {
        setWeddingSite(loadedWeddingSite);
      } else {
        setWeddingSite(null);
        setMessages([]);
        setDeliveries([]);
        setGuests([]);
        setSmsTransactions([]);
        setSmsExpiringSoon(0);
        setItineraryAudienceOptions([]);
        setEventGuestIds({});
      }
    } catch {
      toast('Couldn’t load your messages right now. Please try again.', 'error');
      setWeddingSite(null);
      setMessages([]);
      setDeliveries([]);
      setGuests([]);
      setSmsTransactions([]);
      setSmsExpiringSoon(0);
      setItineraryAudienceOptions([]);
      setEventGuestIds({});
      setLoading(false);
    }
  }, [
    isDemoMode,
    setActiveSiteRole,
    setDeliveries,
    setEventGuestIds,
    setGuests,
    setItineraryAudienceOptions,
    setLoading,
    setMessages,
    setMessagesPermissions,
    setMessagesRole,
    setSmsExpiringSoon,
    setSmsTransactions,
    setWeddingSite,
    toast,
    userId,
  ]);

  const fetchMessages = useCallback(async () => {
    if (!weddingSite) return;
    if (isDemoMode) {
      setMessages(readDemoMessages());
      setLoading(false);
      return;
    }
    try {
      setMessages(await loadDashboardMessages(weddingSite.id));
    } catch {
      setMessages([]);
      setDeliveries([]);
      toast('Couldn’t load message history right now. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, setDeliveries, setLoading, setMessages, toast, weddingSite]);

  const fetchGuests = useCallback(async () => {
    if (!weddingSite) return;
    if (isDemoMode) {
      setGuests(demoGuests.map((g) => ({
        id: g.id,
        email: g.email ?? null,
        phone: (g as any).phone ?? null,
        sms_consent: true,
        preferred_language: (g as any).preferred_language ?? null,
        rsvp_status: g.rsvp_status ?? 'pending',
        invitation_sent_at: (g as any).invitation_sent_at ?? null,
        reminder_last_sent_at: (g as any).reminder_last_sent_at ?? null,
        mailing_address_line1: (g as any).mailing_address_line1 ?? null,
        mailing_city: (g as any).mailing_city ?? null,
        mailing_state: (g as any).mailing_state ?? null,
        mailing_postal_code: (g as any).mailing_postal_code ?? null,
        meal_choice: (g as any).meal_choice ?? null,
        first_name: g.first_name ?? null,
        last_name: g.last_name ?? null,
        name: g.name,
      })));
      return;
    }
    try {
      setGuests(await loadMessageGuests(weddingSite.id));
    } catch {
      toast('Couldn’t load guest recipients right now. Please try again.', 'error');
      setGuests([]);
    }
  }, [isDemoMode, setGuests, toast, weddingSite]);

  const fetchDeliveries = useCallback(async () => {
    if (!weddingSite) return;
    if (isDemoMode) {
      setDeliveries([]);
      return;
    }

    const prioritizedMessageIds = viewingMessage
      ? [viewingMessage.id, ...messages.filter((m) => m.id !== viewingMessage.id).slice(0, 49).map((m) => m.id)]
      : messages.slice(0, 50).map((m) => m.id);

    const messageIds = Array.from(new Set(prioritizedMessageIds));
    if (messageIds.length === 0) {
      setDeliveries([]);
      return;
    }

    if (hasMessageDeliveriesTable === false) {
      setDeliveries([]);
      return;
    }

    try {
      const data = await loadMessageDeliveries(messageIds);
      hasMessageDeliveriesTable = true;
      setDeliveries(data || []);
    } catch (error) {
      if (isMissingMessageDeliveriesTable(error)) {
        hasMessageDeliveriesTable = false;
      } else {
        toast('Couldn’t load delivery history right now. Please try again.', 'error');
      }
      setDeliveries([]);
    }
  }, [isDemoMode, messages, setDeliveries, toast, viewingMessage, weddingSite]);

  const fetchItinerarySegments = useCallback(async () => {
    if (!weddingSite) return;
    try {
      if (isDemoMode) {
        const total = demoGuests.length;
        const demoEventList = (demoEvents && demoEvents.length > 0)
          ? demoEvents.slice(0, 4)
          : [
              { id: 'demo-event-rehearsal', event_name: 'Rehearsal Dinner', event_date: new Date().toISOString().slice(0, 10) },
              { id: 'demo-event-ceremony', event_name: 'Ceremony', event_date: new Date().toISOString().slice(0, 10) },
              { id: 'demo-event-reception', event_name: 'Reception', event_date: new Date().toISOString().slice(0, 10) },
            ];

        const options = demoEventList.map((e, idx) => ({
          value: `event:${e.id}`,
          label: formatMessageEventOptionLabel(e.event_name, e.event_date),
          count: Math.max(0, total - idx * 8),
        }));
        setItineraryAudienceOptions(options);

        const map: Record<string, Set<string>> = {};
        for (const e of demoEventList) {
          map[e.id] = new Set(demoGuests.map((g) => g.id));
        }
        setEventGuestIds(map);
        return;
      }

      const { options, guestIdsByEvent } = await loadMessageItineraryAudience(weddingSite.id);
      setEventGuestIds(guestIdsByEvent);
      setItineraryAudienceOptions(options);
    } catch {
      toast('Couldn’t load itinerary audience segments right now. Please try again.', 'error');
      setItineraryAudienceOptions([]);
      setEventGuestIds({});
    }
  }, [isDemoMode, setEventGuestIds, setItineraryAudienceOptions, toast, weddingSite]);

  const fetchSmsExpiryPreview = useCallback(async () => {
    if (!weddingSite) return;
    if (isDemoMode) {
      setSmsExpiringSoon(40);
      setSmsTransactions([
        { id: 'demo-tx-1', credits_delta: 100, reason: 'purchase', created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), expires_at: new Date(Date.now() + 359 * 24 * 60 * 60 * 1000).toISOString(), remaining_credits: 72 },
        { id: 'demo-tx-2', credits_delta: -28, reason: 'usage', created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      ]);
      return;
    }

    try {
      const cutoff = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { expiringSoon, transactions } = await loadSmsCreditPreview(weddingSite.id, cutoff);
      setSmsExpiringSoon(expiringSoon);
      setSmsTransactions(transactions);
    } catch {
      toast('Couldn’t load text credit activity right now. Please try again.', 'error');
      setSmsExpiringSoon(0);
      setSmsTransactions([]);
    }
  }, [isDemoMode, setSmsExpiringSoon, setSmsTransactions, toast, weddingSite]);

  useEffect(() => {
    void fetchWeddingSite();
  }, [fetchWeddingSite]);

  useEffect(() => {
    if (!weddingSite) return;
    void fetchMessages();
    void fetchGuests();
    void fetchSmsExpiryPreview();
    void fetchItinerarySegments();
  }, [fetchGuests, fetchItinerarySegments, fetchMessages, fetchSmsExpiryPreview, weddingSite]);

  useEffect(() => {
    if (!weddingSite || messages.length === 0) return;
    void fetchDeliveries();
  }, [fetchDeliveries, messages, weddingSite]);

  return {
    fetchWeddingSite,
    fetchMessages,
    fetchGuests,
    fetchSmsExpiryPreview,
  };
}
