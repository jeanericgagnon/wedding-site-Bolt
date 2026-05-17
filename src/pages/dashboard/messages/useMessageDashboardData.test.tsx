import { renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  loadDashboardMessagesMock,
  loadMessageDeliveriesMock,
  loadMessageGuestsMock,
  loadMessageItineraryAudienceMock,
  loadMessagesActiveSiteMock,
  loadSmsCreditPreviewMock,
  readDemoMessagesMock,
} = vi.hoisted(() => ({
  loadDashboardMessagesMock: vi.fn(async () => []),
  loadMessageDeliveriesMock: vi.fn(async () => []),
  loadMessageGuestsMock: vi.fn(async () => []),
  loadMessageItineraryAudienceMock: vi.fn(async () => ({ guestIdsByEvent: {}, options: [] })),
  loadMessagesActiveSiteMock: vi.fn(),
  loadSmsCreditPreviewMock: vi.fn(async () => ({ expiringSoon: 0, transactions: [] })),
  readDemoMessagesMock: vi.fn(() => []),
}));

vi.mock('./messageService', () => ({
  isMissingMessageDeliveriesTable: vi.fn(() => false),
  loadDashboardMessages: loadDashboardMessagesMock,
  loadMessageDeliveries: loadMessageDeliveriesMock,
  loadMessageGuests: loadMessageGuestsMock,
  loadMessageItineraryAudience: loadMessageItineraryAudienceMock,
  loadMessagesActiveSite: loadMessagesActiveSiteMock,
  loadSmsCreditPreview: loadSmsCreditPreviewMock,
}));

vi.mock('./messageDemoStorage', () => ({
  readDemoMessages: readDemoMessagesMock,
}));

import type {
  AudienceOption,
  DeliveryRow,
  Guest,
  Message,
  SmsCreditTransaction,
  WeddingSite,
} from './messageDashboardTypes';
import type { PlannerPermissionKey } from '../../../lib/plannerAccess';
import { useMessageDashboardData } from './useMessageDashboardData';

describe('useMessageDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('clears loading when the active site resolves without a messages site row', async () => {
    loadMessagesActiveSiteMock.mockResolvedValue({
      activeSite: { id: 'site-1', role: 'owner', permissions: null },
      weddingSite: null,
    });

    const toast = vi.fn();
    const { result } = renderHook(() => {
      const [weddingSite, setWeddingSite] = useState<WeddingSite | null>(null);
      const [messages, setMessages] = useState<Message[]>([]);
      const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
      const [guests, setGuests] = useState<Guest[]>([]);
      const [loading, setLoading] = useState(true);
      const [smsTransactions, setSmsTransactions] = useState<SmsCreditTransaction[]>([]);
      const [smsExpiringSoon, setSmsExpiringSoon] = useState(0);
      const [itineraryAudienceOptions, setItineraryAudienceOptions] = useState<AudienceOption[]>([]);
      const [eventGuestIds, setEventGuestIds] = useState<Record<string, Set<string>>>({});
      const [messagesRole, setMessagesRole] = useState<'owner' | 'planner' | 'coordinator' | 'viewer'>('owner');
      const [activeSiteRole, setActiveSiteRole] = useState<'owner' | 'planner' | 'coordinator' | 'viewer'>('owner');
      const [messagesPermissions, setMessagesPermissions] = useState<PlannerPermissionKey[] | null>(null);

      useMessageDashboardData({
        userId: 'user-1',
        isDemoMode: false,
        viewingMessage: null,
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
      });

      return {
        activeSiteRole,
        deliveries,
        eventGuestIds,
        guests,
        itineraryAudienceOptions,
        loading,
        messages,
        messagesPermissions,
        messagesRole,
        smsExpiringSoon,
        smsTransactions,
        weddingSite,
      };
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.weddingSite).toBeNull();
    expect(result.current.messages).toEqual([]);
    expect(result.current.deliveries).toEqual([]);
    expect(result.current.guests).toEqual([]);
    expect(result.current.smsTransactions).toEqual([]);
    expect(result.current.smsExpiringSoon).toBe(0);
    expect(result.current.itineraryAudienceOptions).toEqual([]);
    expect(result.current.eventGuestIds).toEqual({});
    expect(toast).not.toHaveBeenCalled();
  });

  it('clears loading and shows a recoverable toast when the messages site lookup fails', async () => {
    loadMessagesActiveSiteMock.mockRejectedValue(new Error('boom'));

    const toast = vi.fn();
    const { result } = renderHook(() => {
      const [weddingSite, setWeddingSite] = useState<WeddingSite | null>(null);
      const [messages, setMessages] = useState<Message[]>([]);
      const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
      const [guests, setGuests] = useState<Guest[]>([]);
      const [loading, setLoading] = useState(true);
      const [smsTransactions, setSmsTransactions] = useState<SmsCreditTransaction[]>([]);
      const [smsExpiringSoon, setSmsExpiringSoon] = useState(0);
      const [itineraryAudienceOptions, setItineraryAudienceOptions] = useState<AudienceOption[]>([]);
      const [eventGuestIds, setEventGuestIds] = useState<Record<string, Set<string>>>({});
      const [messagesRole, setMessagesRole] = useState<'owner' | 'planner' | 'coordinator' | 'viewer'>('owner');
      const [activeSiteRole, setActiveSiteRole] = useState<'owner' | 'planner' | 'coordinator' | 'viewer'>('owner');
      const [messagesPermissions, setMessagesPermissions] = useState<PlannerPermissionKey[] | null>(null);

      useMessageDashboardData({
        userId: 'user-1',
        isDemoMode: false,
        viewingMessage: null,
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
      });

      return {
        deliveries,
        eventGuestIds,
        guests,
        itineraryAudienceOptions,
        loading,
        messages,
        smsExpiringSoon,
        smsTransactions,
        weddingSite,
      };
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.weddingSite).toBeNull();
    expect(result.current.messages).toEqual([]);
    expect(result.current.deliveries).toEqual([]);
    expect(result.current.guests).toEqual([]);
    expect(result.current.smsTransactions).toEqual([]);
    expect(result.current.smsExpiringSoon).toBe(0);
    expect(result.current.itineraryAudienceOptions).toEqual([]);
    expect(result.current.eventGuestIds).toEqual({});
    expect(toast).toHaveBeenCalledWith('Couldn’t load your messages right now. Please try again.', 'error');
  });
});
