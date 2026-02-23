import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, Button, Badge, Input } from '../../components/ui';
import { Download, UserPlus, CheckCircle2, XCircle, Clock, X, Upload, Users, Mail, AlertCircle, Merge, Scissors, Home, CalendarDays, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import { demoWeddingSite, demoGuests, demoRSVPs } from '../../lib/demoData';
import { sendWeddingInvitation } from '../../lib/emailService';

interface Guest {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  plus_one_allowed: boolean;
  plus_one_name: string | null;
  invited_to_ceremony: boolean;
  invited_to_reception: boolean;
  invite_token: string | null;
  rsvp_status: string;
  rsvp_received_at: string | null;
  household_id: string | null;
}

interface RSVP {
  attending: boolean;
  meal_choice: string | null;
  plus_one_name: string | null;
  notes: string | null;
}

interface GuestWithRSVP extends Guest {
  rsvp?: RSVP;
}

function parseRsvpEventSelections(notes: string | null): { ceremony?: boolean; reception?: boolean } | null {
  if (!notes) return null;
  const match = notes.match(/\[Events\s+([^\]]+)\]/i);
  if (!match) return null;

  const pairs = match[1]
    .split(',')
    .map((part) => part.trim())
    .map((part) => {
      const [k, v] = part.split(':').map((x) => (x || '').trim().toLowerCase());
      return [k, v === 'yes'] as const;
    });

  const map = Object.fromEntries(pairs) as Record<string, boolean>;
  return {
    ceremony: map.ceremony,
    reception: map.reception,
  };
}

interface WeddingSiteInfo {
  couple_name_1: string;
  couple_name_2: string;
  wedding_date: string | null;
  venue_name: string | null;
  venue_address: string | null;
  site_url: string | null;
}

interface ItineraryEvent {
  id: string;
  event_name: string;
  event_date: string | null;
  start_time: string | null;
  location_name: string | null;
}

export const DashboardGuests: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const { toast } = useToast();
  const [guests, setGuests] = useState<GuestWithRSVP[]>([]);
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);
  const [weddingSiteInfo, setWeddingSiteInfo] = useState<WeddingSiteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'declined' | 'pending' | 'ceremony-no' | 'reception-no'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<GuestWithRSVP | null>(null);
  const [sendingInviteId, setSendingInviteId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'list' | 'households'>('list');
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [householdBusy, setHouseholdBusy] = useState(false);

  const [csvPreview, setCsvPreview] = useState<Record<string, unknown>[] | null>(null);
  const [csvSkipped, setCsvSkipped] = useState<string[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);

  const [itineraryDrawerGuest, setItineraryDrawerGuest] = useState<GuestWithRSVP | null>(null);
  const [itineraryEvents, setItineraryEvents] = useState<ItineraryEvent[]>([]);
  const [guestEventIds, setGuestEventIds] = useState<Set<string>>(new Set());
  const [loadingDrawer, setLoadingDrawer] = useState(false);
  const [togglingEventId, setTogglingEventId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    plus_one_allowed: false,
    invited_to_ceremony: true,
    invited_to_reception: true,
  });

  const fetchWeddingSite = useCallback(async () => {
    if (!user) return;

    if (isDemoMode) {
      setWeddingSiteId(demoWeddingSite.id);
      return;
    }

    const { data } = await supabase
      .from('wedding_sites')
      .select('id, couple_name_1, couple_name_2, wedding_date, venue_name, venue_address, site_url')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setWeddingSiteId(data.id);
      setWeddingSiteInfo({
        couple_name_1: data.couple_name_1 ?? '',
        couple_name_2: data.couple_name_2 ?? '',
        wedding_date: data.wedding_date ?? null,
        venue_name: data.venue_name ?? null,
        venue_address: data.venue_address ?? null,
        site_url: data.site_url ?? null,
      });
    }
  }, [user, isDemoMode]);

  const fetchGuests = useCallback(async () => {
    if (!weddingSiteId) return;

    setLoading(true);
    try {
      if (isDemoMode) {
        const guestsWithRsvps = demoGuests.map(guest => ({
          ...guest,
          phone: null,
          plus_one_allowed: false,
          plus_one_name: null,
          rsvp_received_at: guest.rsvp_status !== 'pending' ? new Date().toISOString() : null,
          rsvp: demoRSVPs.find(r => r.guest_id === guest.id),
        }));
        setGuests(guestsWithRsvps as unknown as GuestWithRSVP[]);
        setLoading(false);
        return;
      }

      const { data: guestsData, error: guestsError } = await supabase
        .from('guests')
        .select('*')
        .eq('wedding_site_id', weddingSiteId)
        .order('created_at', { ascending: false });

      if (guestsError) throw guestsError;

      if (guestsData) {
        const guestIds = guestsData.map(g => g.id);
        const { data: rsvpsData } = await supabase
          .from('rsvps')
          .select('*')
          .in('guest_id', guestIds);

        const guestsWithRsvps = guestsData.map(guest => ({
          ...guest,
          rsvp: rsvpsData?.find(r => r.guest_id === guest.id),
        }));

        setGuests(guestsWithRsvps as unknown as GuestWithRSVP[]);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [weddingSiteId, isDemoMode]);

  useEffect(() => {
    fetchWeddingSite();
  }, [fetchWeddingSite]);

  useEffect(() => {
    if (weddingSiteId) {
      fetchGuests();
    }
  }, [weddingSiteId, fetchGuests]);

  const generateSecureToken = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('generate_secure_token', { byte_length: 32 });
    if (error || !data) throw new Error('Failed to generate token');
    return data as string;
  };

  const generateLocalInviteToken = () => `demo_${Math.random().toString(36).slice(2, 14)}`;

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weddingSiteId) return;

    try {
      if (isDemoMode) {
        const newGuest: GuestWithRSVP = {
          id: `demo-${Date.now()}`,
          first_name: formData.first_name,
          last_name: formData.last_name,
          name: `${formData.first_name} ${formData.last_name}`.trim(),
          email: formData.email || null,
          phone: formData.phone || null,
          plus_one_allowed: formData.plus_one_allowed,
          plus_one_name: null,
          invited_to_ceremony: formData.invited_to_ceremony,
          invited_to_reception: formData.invited_to_reception,
          invite_token: generateLocalInviteToken(),
          rsvp_status: 'pending',
          rsvp_received_at: null,
          household_id: null,
        };

        setGuests(prev => [newGuest, ...prev]);
        setShowAddModal(false);
        resetForm();
        toast(`${formData.first_name} ${formData.last_name} added`, 'success');
        return;
      }

      const inviteToken = await generateSecureToken();
      const { error } = await supabase
        .from('guests')
        .insert([{
          wedding_site_id: weddingSiteId,
          first_name: formData.first_name,
          last_name: formData.last_name,
          name: `${formData.first_name} ${formData.last_name}`,
          email: formData.email || null,
          phone: formData.phone || null,
          plus_one_allowed: formData.plus_one_allowed,
          invited_to_ceremony: formData.invited_to_ceremony,
          invited_to_reception: formData.invited_to_reception,
          invite_token: inviteToken,
          rsvp_status: 'pending',
        }]);

      if (error) throw error;

      await fetchGuests();
      setShowAddModal(false);
      resetForm();
      toast(`${formData.first_name} ${formData.last_name} added`, 'success');
    } catch {
      toast('Failed to add guest. Please try again.', 'error');
    }
  };

  const handleEditGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuest) return;

    try {
      if (isDemoMode) {
        setGuests(prev => prev.map(guest => (
          guest.id === editingGuest.id
            ? {
                ...guest,
                first_name: formData.first_name,
                last_name: formData.last_name,
                name: `${formData.first_name} ${formData.last_name}`.trim(),
                email: formData.email || null,
                phone: formData.phone || null,
                plus_one_allowed: formData.plus_one_allowed,
                invited_to_ceremony: formData.invited_to_ceremony,
                invited_to_reception: formData.invited_to_reception,
              }
            : guest
        )));
        setEditingGuest(null);
        resetForm();
        toast('Guest updated', 'success');
        return;
      }

      const { error } = await supabase
        .from('guests')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          name: `${formData.first_name} ${formData.last_name}`,
          email: formData.email || null,
          phone: formData.phone || null,
          plus_one_allowed: formData.plus_one_allowed,
          invited_to_ceremony: formData.invited_to_ceremony,
          invited_to_reception: formData.invited_to_reception,
        })
        .eq('id', editingGuest.id);

      if (error) throw error;

      await fetchGuests();
      setEditingGuest(null);
      resetForm();
      toast('Guest updated', 'success');
    } catch {
      toast('Failed to update guest. Please try again.', 'error');
    }
  };

  const [deletingGuestId, setDeletingGuestId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteGuest = async (guestId: string) => {
    if (confirmDeleteId !== guestId) {
      setConfirmDeleteId(guestId);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }

    setDeletingGuestId(guestId);
    setConfirmDeleteId(null);
    try {
      if (isDemoMode) {
        setGuests(prev => prev.filter(guest => guest.id !== guestId));
        toast('Guest removed', 'success');
        return;
      }

      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', guestId);

      if (error) throw error;

      await fetchGuests();
      toast('Guest removed', 'success');
    } catch {
      toast('Failed to remove guest. Please try again.', 'error');
    } finally {
      setDeletingGuestId(null);
    }
  };

  const handleSendInvitation = async (guest: GuestWithRSVP) => {
    if (!guest.email) {
      toast('This guest has no email address', 'error');
      return;
    }
    if (isDemoMode) {
      toast('Demo: invitation send simulated (no real email sent)', 'success');
      return;
    }

    setSendingInviteId(guest.id);
    try {
      const guestName = guest.first_name && guest.last_name
        ? `${guest.first_name} ${guest.last_name}`
        : guest.name;

      await sendWeddingInvitation({
        guestEmail: guest.email,
        guestName,
        coupleName1: weddingSiteInfo?.couple_name_1 ?? '',
        coupleName2: weddingSiteInfo?.couple_name_2 ?? '',
        weddingDate: weddingSiteInfo?.wedding_date ?? null,
        venueName: weddingSiteInfo?.venue_name ?? null,
        venueAddress: weddingSiteInfo?.venue_address ?? null,
        siteUrl: weddingSiteInfo?.site_url ?? null,
        inviteToken: guest.invite_token ?? null,
      });

      await supabase
        .from('guests')
        .update({ invitation_sent_at: new Date().toISOString() })
        .eq('id', guest.id);

      toast(`Invitation sent to ${guestName}`, 'success');
    } catch {
      toast('Failed to send invitation. Please try again.', 'error');
    } finally {
      setSendingInviteId(null);
    }
  };

  async function handleMergeIntoHousehold() {
    if (selectedGuestIds.size < 2 || !weddingSiteId || isDemoMode) return;
    setHouseholdBusy(true);
    try {
      const ids = [...selectedGuestIds];
      const householdId = ids[0];
      const { error } = await supabase
        .from('guests')
        .update({ household_id: householdId })
        .in('id', ids)
        .eq('wedding_site_id', weddingSiteId);
      if (error) throw error;
      await fetchGuests();
      setSelectedGuestIds(new Set());
      toast(`${ids.length} guests merged into one household`, 'success');
    } catch {
      toast('Failed to merge guests', 'error');
    } finally {
      setHouseholdBusy(false);
    }
  }

  async function handleSplitFromHousehold(guestId: string) {
    if (!weddingSiteId || isDemoMode) return;
    setHouseholdBusy(true);
    try {
      const { error } = await supabase
        .from('guests')
        .update({ household_id: null })
        .eq('id', guestId)
        .eq('wedding_site_id', weddingSiteId);
      if (error) throw error;
      await fetchGuests();
      toast('Guest removed from household', 'success');
    } catch {
      toast('Failed to remove from household', 'error');
    } finally {
      setHouseholdBusy(false);
    }
  }

  async function handleReassignHousehold(guestId: string, newHouseholdId: string) {
    if (!weddingSiteId || isDemoMode) return;
    try {
      const { error } = await supabase
        .from('guests')
        .update({ household_id: newHouseholdId || null })
        .eq('id', guestId)
        .eq('wedding_site_id', weddingSiteId);
      if (error) throw error;
      await fetchGuests();
      toast('Guest reassigned', 'success');
    } catch {
      toast('Failed to reassign guest', 'error');
    }
  }

  async function openItineraryDrawer(guest: GuestWithRSVP) {
    if (!weddingSiteId) return;
    setItineraryDrawerGuest(guest);
    setLoadingDrawer(true);
    try {
      const [eventsResult, invitesResult] = await Promise.all([
        supabase
          .from('itinerary_events')
          .select('id, event_name, event_date, start_time, location_name')
          .eq('wedding_site_id', weddingSiteId)
          .order('event_date', { ascending: true }),
        supabase
          .from('event_invitations')
          .select('event_id')
          .eq('guest_id', guest.id),
      ]);
      setItineraryEvents((eventsResult.data ?? []) as ItineraryEvent[]);
      setGuestEventIds(new Set((invitesResult.data ?? []).map((r: { event_id: string }) => r.event_id)));
    } finally {
      setLoadingDrawer(false);
    }
  }

  async function handleToggleEventInvite(eventId: string, currentlyInvited: boolean) {
    if (!itineraryDrawerGuest || togglingEventId) return;
    setTogglingEventId(eventId);
    try {
      if (currentlyInvited) {
        await supabase
          .from('event_invitations')
          .delete()
          .eq('event_id', eventId)
          .eq('guest_id', itineraryDrawerGuest.id);
        setGuestEventIds(prev => { const n = new Set(prev); n.delete(eventId); return n; });
      } else {
        await supabase
          .from('event_invitations')
          .insert({ event_id: eventId, guest_id: itineraryDrawerGuest.id });
        setGuestEventIds(prev => new Set([...prev, eventId]));
      }
    } catch {
      toast('Failed to update event invitation', 'error');
    } finally {
      setTogglingEventId(null);
    }
  }

  const households = useMemo(() => {
    const map = new Map<string, GuestWithRSVP[]>();
    const ungrouped: GuestWithRSVP[] = [];
    guests.forEach(g => {
      if (g.household_id) {
        const existing = map.get(g.household_id) ?? [];
        map.set(g.household_id, [...existing, g]);
      } else {
        ungrouped.push(g);
      }
    });
    return { grouped: [...map.entries()], ungrouped };
  }, [guests]);

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      plus_one_allowed: false,
      invited_to_ceremony: true,
      invited_to_reception: true,
    });
  };

  const openEditModal = (guest: GuestWithRSVP) => {
    setEditingGuest(guest);
    setFormData({
      first_name: guest.first_name || '',
      last_name: guest.last_name || '',
      email: guest.email || '',
      phone: guest.phone || '',
      plus_one_allowed: guest.plus_one_allowed,
      invited_to_ceremony: guest.invited_to_ceremony,
      invited_to_reception: guest.invited_to_reception,
    });
  };

  const exportCSV = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Status', 'Plus One', 'Meal Choice', 'RSVP Date', 'Invite Token'];
    const rows = guests.map(guest => [
      guest.first_name || '',
      guest.last_name || '',
      guest.email || '',
      guest.phone || '',
      guest.rsvp_status,
      guest.plus_one_allowed ? 'Yes' : 'No',
      guest.rsvp?.meal_choice || '',
      guest.rsvp_received_at ? new Date(guest.rsvp_received_at).toLocaleDateString() : '',
      guest.invite_token || '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `guests_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !weddingSiteId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rawLines = text.split('\n');
      if (rawLines.length < 2) {
        toast('CSV file appears to be empty or missing a header row.', 'error');
        return;
      }

      const headers = rawLines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
      const hasFirstName = headers.includes('first name');
      const hasLastName = headers.includes('last name');

      if (!hasFirstName && !hasLastName) {
        toast('CSV must have "First Name" and "Last Name" columns. Check your file headers and try again.', 'error');
        return;
      }

      const dataLines = rawLines.slice(1).filter(line => line.trim());
      const skipped: string[] = [];
      const parsed: Record<string, unknown>[] = [];

      dataLines.forEach((line, idx) => {
        const values = line.split(',').map(v => v.replace(/"/g, '').trim());
        const guest: Record<string, unknown> = {
          wedding_site_id: weddingSiteId,
          rsvp_status: 'pending',
          plus_one_allowed: false,
          invited_to_ceremony: true,
          invited_to_reception: true,
        };

        headers.forEach((header, i) => {
          const value = values[i] ?? '';
          if (header === 'first name') guest.first_name = value;
          if (header === 'last name') guest.last_name = value;
          if (header === 'email') guest.email = value || null;
          if (header === 'phone') guest.phone = value || null;
          if (header === 'plus one') guest.plus_one_allowed = value.toLowerCase() === 'yes';
        });

        guest.name = `${guest.first_name || ''} ${guest.last_name || ''}`.trim();

        if (!guest.first_name && !guest.last_name) {
          skipped.push(`Row ${idx + 2}: missing name`);
          return;
        }

        parsed.push(guest);
      });

      if (parsed.length === 0) {
        toast('No valid guests found in the file. All rows were skipped.', 'error');
        return;
      }

      setCsvPreview(parsed);
      setCsvSkipped(skipped);
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmCsvImport = async () => {
    if (!csvPreview || !weddingSiteId) return;
    setCsvImporting(true);
    try {
      if (isDemoMode) {
        const importedGuests = csvPreview.map((g, idx) => ({
          id: `demo-import-${Date.now()}-${idx}`,
          first_name: String(g.first_name || ''),
          last_name: String(g.last_name || ''),
          name: `${String(g.first_name || '')} ${String(g.last_name || '')}`.trim(),
          email: g.email ? String(g.email) : null,
          phone: g.phone ? String(g.phone) : null,
          plus_one_allowed: Boolean(g.plus_one_allowed),
          plus_one_name: null,
          invited_to_ceremony: true,
          invited_to_reception: true,
          invite_token: generateLocalInviteToken(),
          rsvp_status: 'pending',
          rsvp_received_at: null,
          household_id: null,
        } as GuestWithRSVP));

        setGuests(prev => [...importedGuests, ...prev]);
        const skippedMsg = csvSkipped.length > 0 ? `, ${csvSkipped.length} skipped` : '';
        toast(`${csvPreview.length} guest${csvPreview.length !== 1 ? 's' : ''} imported${skippedMsg}`, 'success');
        setCsvPreview(null);
        setCsvSkipped([]);
        return;
      }

      const guestsWithTokens = await Promise.all(
        csvPreview.map(async g => ({ ...g, invite_token: await generateSecureToken() }))
      );
      const { error } = await supabase.from('guests').insert(guestsWithTokens);
      if (error) throw error;
      await fetchGuests();
      const skippedMsg = csvSkipped.length > 0 ? `, ${csvSkipped.length} skipped` : '';
      toast(`${csvPreview.length} guest${csvPreview.length !== 1 ? 's' : ''} imported${skippedMsg}`, 'success');
      setCsvPreview(null);
      setCsvSkipped([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast(`Import failed: ${msg}`, 'error');
    } finally {
      setCsvImporting(false);
    }
  };

  const filteredGuests = guests.filter((guest) => {
    const searchTerm = searchQuery.toLowerCase();
    const matchesSearch =
      guest.first_name?.toLowerCase().includes(searchTerm) ||
      guest.last_name?.toLowerCase().includes(searchTerm) ||
      guest.name.toLowerCase().includes(searchTerm) ||
      guest.email?.toLowerCase().includes(searchTerm);
    const matchesFilter = filterStatus === 'all' || guest.rsvp_status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: guests.length,
    confirmed: guests.filter(g => g.rsvp_status === 'confirmed').length,
    declined: guests.filter(g => g.rsvp_status === 'declined').length,
    pending: guests.filter(g => g.rsvp_status === 'pending').length,
    rsvpRate: guests.length > 0 ? Math.round(((guests.filter(g => g.rsvp_status !== 'pending').length) / guests.length) * 100) : 0,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'error' | 'warning'> = {
      confirmed: 'success',
      declined: 'error',
      pending: 'warning',
    };
    const labels: Record<string, string> = {
      confirmed: 'Confirmed',
      declined: 'Declined',
      pending: 'Pending',
    };
    return <Badge variant={variants[status] || 'warning'}>{labels[status] || status}</Badge>;
  };

  const GuestFormModal = ({ onSubmit, onClose, title }: { onSubmit: (e: React.FormEvent) => void; onClose: () => void; title: string }) => (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="guest-modal-title">
        <div className="bg-surface rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto border border-border-subtle">
          <div className="flex justify-between items-center mb-5">
            <h2 id="guest-modal-title" className="text-xl font-semibold text-text-primary">{title}</h2>
            <button onClick={onClose} className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-subtle rounded-lg transition-colors" aria-label="Close">
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">First Name *</label>
              <Input
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Last Name *</label>
              <Input
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Phone</label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.plus_one_allowed}
                  onChange={(e) => setFormData({ ...formData, plus_one_allowed: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-text-primary">Allow Plus One</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.invited_to_ceremony}
                  onChange={(e) => setFormData({ ...formData, invited_to_ceremony: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-text-primary">Invited to Ceremony</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.invited_to_reception}
                  onChange={(e) => setFormData({ ...formData, invited_to_reception: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-text-primary">Invited to Reception</span>
              </label>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" fullWidth onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" fullWidth>
                {editingGuest ? 'Update' : 'Add'} Guest
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );

  if (loading) {
    return (
      <DashboardLayout currentPage="guests">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-text-secondary text-sm">Loading guests...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="guests">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Guests & RSVP</h1>
          <p className="text-text-secondary">Manage your guest list and track responses</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card variant="bordered" padding="md">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success-light rounded-lg flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-success" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stats.confirmed}</p>
                <p className="text-sm text-text-secondary">Confirmed</p>
              </div>
            </div>
          </Card>

          <Card variant="bordered" padding="md">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-error-light rounded-lg flex-shrink-0">
                <XCircle className="w-6 h-6 text-error" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stats.declined}</p>
                <p className="text-sm text-text-secondary">Declined</p>
              </div>
            </div>
          </Card>

          <Card variant="bordered" padding="md">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-warning-light rounded-lg flex-shrink-0">
                <Clock className="w-6 h-6 text-warning" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stats.pending}</p>
                <p className="text-sm text-text-secondary">Pending</p>
              </div>
            </div>
          </Card>

          <Card variant="bordered" padding="md">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-light rounded-lg flex-shrink-0">
                <Users className="w-6 h-6 text-primary" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
                <p className="text-sm text-text-secondary">Total ({stats.rsvpRate}% responded)</p>
              </div>
            </div>
          </Card>
        </div>

        {(() => {
          const conflicts: string[] = [];
          const emailsSeen = new Map<string, string>();
          guests.forEach(g => {
            if (g.email) {
              const key = g.email.toLowerCase();
              if (emailsSeen.has(key)) {
                conflicts.push(`Duplicate email ${g.email}: ${emailsSeen.get(key)} and ${g.first_name ?? ''} ${g.last_name ?? ''}`);
              } else {
                emailsSeen.set(key, `${g.first_name ?? ''} ${g.last_name ?? ''}`);
              }
            }
            if (g.plus_one_allowed && g.rsvp?.attending === false) {
              conflicts.push(`${g.first_name ?? ''} ${g.last_name ?? ''} declined but still has plus-one allowed`);
            }
          });
          if (conflicts.length === 0) return null;
          return (
            <div className="p-4 bg-warning-light border border-warning/20 rounded-xl space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
                <p className="text-sm font-medium text-warning">{conflicts.length} RSVP {conflicts.length === 1 ? 'issue' : 'issues'} detected</p>
              </div>
              <ul className="space-y-0.5">
                {conflicts.map((c, i) => (
                  <li key={i} className="text-xs text-warning/90">• {c}</li>
                ))}
              </ul>
            </div>
          );
        })()}

        <Card variant="bordered" padding="lg">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search guests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={importCSV}
                    className="hidden"
                  />
                  <span className="inline-flex items-center px-3 py-2 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-surface-subtle cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    Import CSV
                  </span>
                </label>
                <Button variant="outline" size="md" onClick={exportCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button variant="primary" size="md" onClick={() => { resetForm(); setShowAddModal(true); }}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Guest
                </Button>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                {([
                  { id: 'all', label: `All (${stats.total})` },
                  { id: 'confirmed', label: `Confirmed (${stats.confirmed})` },
                  { id: 'declined', label: `Declined (${stats.declined})` },
                  { id: 'pending', label: `Pending (${stats.pending})` },
                ] as const).map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => { setFilterStatus(id); setViewMode('list'); }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filterStatus === id && viewMode === 'list'
                        ? 'bg-primary text-text-inverse'
                        : 'bg-surface-subtle text-text-secondary hover:bg-surface hover:text-text-primary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setViewMode(v => v === 'households' ? 'list' : 'households')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  viewMode === 'households'
                    ? 'bg-primary text-text-inverse border-primary'
                    : 'text-text-secondary border-border hover:border-primary hover:text-primary'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                Households
              </button>
            </div>

            {viewMode === 'households' ? (
              <div className="space-y-4">
                {selectedGuestIds.size >= 2 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-primary/8 border border-primary/20 rounded-xl">
                    <span className="text-sm font-medium text-primary">{selectedGuestIds.size} guests selected</span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleMergeIntoHousehold}
                      disabled={householdBusy || isDemoMode}
                    >
                      <Merge className="w-3.5 h-3.5 mr-1.5" />
                      Merge into Household
                    </Button>
                  </div>
                )}

                {households.grouped.length === 0 && households.ungrouped.length === 0 && (
                  <div className="text-center py-12">
                    <Home className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
                    <p className="text-text-secondary font-medium mb-1">No households yet</p>
                    <p className="text-sm text-text-tertiary">Select guests from the list view to merge them into a household</p>
                  </div>
                )}

                {households.grouped.map(([householdId, members]) => {
                  const head = members.find(m => m.id === householdId) ?? members[0];
                  const headName = head ? (head.first_name && head.last_name ? `${head.first_name} ${head.last_name}` : head.name) : 'Household';
                  return (
                    <div key={householdId} className="border border-border rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 bg-surface-subtle border-b border-border">
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4 text-text-tertiary" />
                          <span className="font-semibold text-text-primary text-sm">{headName} household</span>
                          <span className="text-xs text-text-tertiary">({members.length} guests)</span>
                        </div>
                      </div>
                      <div className="divide-y divide-border-subtle">
                        {members.map(guest => {
                          const name = guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.name;
                          return (
                            <div key={guest.id} className="flex items-center justify-between px-5 py-3">
                              <div>
                                <p className="text-sm font-medium text-text-primary">{name}</p>
                                <p className="text-xs text-text-tertiary">{guest.email || 'No email'}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                {getStatusBadge(guest.rsvp_status)}
                                <button
                                  onClick={() => handleSplitFromHousehold(guest.id)}
                                  disabled={householdBusy || isDemoMode}
                                  title="Remove from household"
                                  className="p-1.5 text-text-tertiary hover:text-error hover:bg-error-light rounded-lg transition-colors disabled:opacity-40"
                                >
                                  <Scissors className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {households.ungrouped.length > 0 && (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 bg-surface-subtle border-b border-border">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-text-tertiary" />
                        <span className="font-semibold text-text-primary text-sm">Ungrouped guests</span>
                        <span className="text-xs text-text-tertiary">({households.ungrouped.length})</span>
                      </div>
                      <p className="text-xs text-text-tertiary">Select guests to merge into households</p>
                    </div>
                    <div className="divide-y divide-border-subtle">
                      {households.ungrouped.map(guest => {
                        const name = guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.name;
                        const isSelected = selectedGuestIds.has(guest.id);
                        return (
                          <div
                            key={guest.id}
                            className={`flex items-center gap-3 px-5 py-3 transition-colors cursor-pointer ${isSelected ? 'bg-primary/5' : 'hover:bg-surface-subtle'}`}
                            onClick={() => setSelectedGuestIds(prev => {
                              const next = new Set(prev);
                              isSelected ? next.delete(guest.id) : next.add(guest.id);
                              return next;
                            })}
                          >
                            <div className={`w-4 h-4 rounded border-2 flex-shrink-0 transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-border'}`}>
                              {isSelected && (
                                <svg viewBox="0 0 10 10" className="w-full h-full p-0.5 text-white" fill="none">
                                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-text-primary">{name}</p>
                              <p className="text-xs text-text-tertiary">{guest.email || 'No email'}</p>
                            </div>
                            {getStatusBadge(guest.rsvp_status)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-surface-subtle border-b border-border">
                      <tr>
                        <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Guest</th>
                        <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Status</th>
                        <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary hidden md:table-cell">Plus One</th>
                        <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary hidden lg:table-cell">Meal Choice</th>
                        <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary hidden xl:table-cell">Invite Code</th>
                        <th className="text-right px-6 py-3 text-sm font-semibold text-text-secondary">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {filteredGuests.map((guest) => (
                        <tr
                          key={guest.id}
                          className="hover:bg-surface-subtle transition-colors cursor-pointer"
                          onClick={() => openItineraryDrawer(guest)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="font-medium text-text-primary">
                                  {guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.name}
                                </p>
                                <p className="text-sm text-text-secondary">{guest.email || '—'}</p>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-text-tertiary ml-1 opacity-0 group-hover:opacity-100" />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              {getStatusBadge(guest.rsvp_status)}
                              {guest.rsvp_received_at && guest.rsvp_status !== 'pending' && (
                                <span className="text-xs text-text-tertiary">
                                  {new Date(guest.rsvp_received_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                              {(() => {
                                const events = parseRsvpEventSelections(guest.rsvp?.notes ?? null);
                                if (!events) return null;
                                return (
                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {typeof events.ceremony === 'boolean' && (
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${events.ceremony ? 'bg-success-light text-success border-success/20' : 'bg-surface-subtle text-text-tertiary border-border'}`}>
                                        Ceremony: {events.ceremony ? 'Yes' : 'No'}
                                      </span>
                                    )}
                                    {typeof events.reception === 'boolean' && (
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${events.reception ? 'bg-success-light text-success border-success/20' : 'bg-surface-subtle text-text-tertiary border-border'}`}>
                                        Reception: {events.reception ? 'Yes' : 'No'}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-text-secondary hidden md:table-cell">
                            {guest.plus_one_allowed ? (guest.rsvp?.plus_one_name || 'Allowed') : 'No'}
                          </td>
                          <td className="px-6 py-4 text-text-secondary hidden lg:table-cell">
                            {guest.rsvp?.meal_choice || '—'}
                          </td>
                          <td className="px-6 py-4 hidden xl:table-cell">
                            <code className="text-xs bg-surface-subtle px-2 py-1 rounded font-mono">
                              {guest.invite_token?.slice(0, 12) || '—'}
                            </code>
                          </td>
                          <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openItineraryDrawer(guest)}
                                title="Manage event invitations"
                              >
                                <CalendarDays className="w-4 h-4 mr-1" />
                                Events
                              </Button>
                              {guest.email && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSendInvitation(guest)}
                                  disabled={sendingInviteId === guest.id}
                                  title={guest.invite_token ? 'Send invitation email' : 'Send invitation'}
                                >
                                  <Mail className="w-4 h-4 mr-1" />
                                  {sendingInviteId === guest.id ? 'Sending…' : 'Invite'}
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => openEditModal(guest)}>
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteGuest(guest.id)}
                                disabled={deletingGuestId === guest.id}
                                className={confirmDeleteId === guest.id ? 'text-error hover:text-error' : ''}
                              >
                                {deletingGuestId === guest.id
                                  ? 'Removing…'
                                  : confirmDeleteId === guest.id
                                  ? 'Confirm?'
                                  : 'Delete'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredGuests.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-text-tertiary mx-auto mb-3" aria-hidden="true" />
                    <p className="text-text-secondary font-medium mb-1">No guests found</p>
                    <p className="text-sm text-text-tertiary">
                      {searchQuery ? 'Try a different search term' : 'Add your first guest to get started'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </div>

      {showAddModal && (
        <GuestFormModal
          title="Add New Guest"
          onSubmit={handleAddGuest}
          onClose={() => { setShowAddModal(false); resetForm(); }}
        />
      )}

      {editingGuest && (
        <GuestFormModal
          title="Edit Guest"
          onSubmit={handleEditGuest}
          onClose={() => { setEditingGuest(null); resetForm(); }}
        />
      )}

      {itineraryDrawerGuest && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setItineraryDrawerGuest(null)}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-surface shadow-2xl z-50 flex flex-col border-l border-border">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-base font-semibold text-text-primary">
                  {itineraryDrawerGuest.first_name && itineraryDrawerGuest.last_name
                    ? `${itineraryDrawerGuest.first_name} ${itineraryDrawerGuest.last_name}`
                    : itineraryDrawerGuest.name}
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">Itinerary event invitations</p>
              </div>
              <button
                onClick={() => setItineraryDrawerGuest(null)}
                className="p-2 rounded-lg hover:bg-surface-subtle text-text-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loadingDrawer ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : itineraryEvents.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
                  <p className="text-sm font-medium text-text-secondary mb-1">No events on the itinerary</p>
                  <p className="text-xs text-text-tertiary">Add events on the Itinerary page first.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-text-tertiary mb-3">
                    Toggle each event to invite or uninvite this guest.
                  </p>
                  {itineraryEvents.map(event => {
                    const invited = guestEventIds.has(event.id);
                    const isToggling = togglingEventId === event.id;
                    return (
                      <button
                        key={event.id}
                        onClick={() => handleToggleEventInvite(event.id, invited)}
                        disabled={isToggling}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                          invited
                            ? 'border-primary/30 bg-primary/5'
                            : 'border-border hover:border-border hover:bg-surface-subtle'
                        } ${isToggling ? 'opacity-50' : ''}`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                          invited ? 'border-primary bg-primary' : 'border-border'
                        }`}>
                          {isToggling
                            ? <Loader2 className="w-3 h-3 animate-spin text-white" />
                            : invited
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              : null
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${invited ? 'text-primary' : 'text-text-primary'}`}>
                            {event.event_name}
                          </p>
                          <p className="text-xs text-text-tertiary mt-0.5">
                            {event.event_date
                              ? new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                              : 'No date set'}
                            {event.start_time && ` · ${event.start_time}`}
                            {event.location_name && ` · ${event.location_name}`}
                          </p>
                        </div>
                        <span className={`text-xs font-medium flex-shrink-0 ${invited ? 'text-primary' : 'text-text-tertiary'}`}>
                          {invited ? 'Invited' : 'Not invited'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {!loadingDrawer && itineraryEvents.length > 0 && (
              <div className="px-5 py-4 border-t border-border bg-surface-subtle">
                <p className="text-xs text-text-tertiary text-center">
                  {guestEventIds.size} of {itineraryEvents.length} events · Changes save instantly
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {csvPreview && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => !csvImporting && setCsvPreview(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-border-subtle">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Review Import</h2>
                  <p className="text-sm text-text-secondary mt-0.5">
                    {csvPreview.length} guest{csvPreview.length !== 1 ? 's' : ''} ready to import
                    {csvSkipped.length > 0 && ` · ${csvSkipped.length} row${csvSkipped.length !== 1 ? 's' : ''} skipped`}
                  </p>
                </div>
                {!csvImporting && (
                  <button onClick={() => setCsvPreview(null)} className="p-2 hover:bg-surface-subtle rounded-lg transition-colors">
                    <X className="w-5 h-5 text-text-secondary" />
                  </button>
                )}
              </div>

              <div className="overflow-y-auto flex-1 p-6">
                {csvSkipped.length > 0 && (
                  <div className="mb-4 p-3 bg-warning-light border border-warning/20 rounded-lg">
                    <p className="text-xs font-medium text-warning mb-1">{csvSkipped.length} row{csvSkipped.length !== 1 ? 's' : ''} will be skipped (missing name)</p>
                    <ul className="space-y-0.5">
                      {csvSkipped.map((s, i) => <li key={i} className="text-xs text-warning/80">• {s}</li>)}
                    </ul>
                  </div>
                )}

                <div className="divide-y divide-border-subtle">
                  {csvPreview.slice(0, 50).map((g, i) => (
                    <div key={i} className="py-2.5 flex items-center gap-4">
                      <div className="w-7 h-7 rounded-full bg-surface-subtle flex items-center justify-center text-xs font-medium text-text-secondary flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {String(g.first_name || '')} {String(g.last_name || '')}
                        </p>
                        {Boolean(g.email) && <p className="text-xs text-text-secondary truncate">{String(g.email)}</p>}
                      </div>
                      {Boolean(g.plus_one_allowed) && (
                        <span className="text-xs px-2 py-0.5 bg-surface-subtle rounded-full text-text-secondary flex-shrink-0">+1</span>
                      )}
                    </div>
                  ))}
                  {csvPreview.length > 50 && (
                    <p className="py-3 text-sm text-text-secondary text-center">
                      …and {csvPreview.length - 50} more
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-border-subtle">
                <Button variant="outline" fullWidth onClick={() => setCsvPreview(null)} disabled={csvImporting}>
                  Cancel
                </Button>
                <Button variant="primary" fullWidth onClick={confirmCsvImport} disabled={csvImporting}>
                  {csvImporting ? 'Importing...' : `Import ${csvPreview.length} Guest${csvPreview.length !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};
