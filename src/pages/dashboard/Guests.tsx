import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, Button, Badge, Input } from '../../components/ui';
import { Download, UserPlus, CheckCircle2, XCircle, Clock, X, Upload, Users, Mail } from 'lucide-react';
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

interface WeddingSiteInfo {
  couple_name_1: string;
  couple_name_2: string;
  wedding_date: string | null;
  venue_name: string | null;
  venue_address: string | null;
  site_url: string | null;
}

export const DashboardGuests: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const { toast } = useToast();
  const [guests, setGuests] = useState<GuestWithRSVP[]>([]);
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);
  const [weddingSiteInfo, setWeddingSiteInfo] = useState<WeddingSiteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'declined' | 'pending'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<GuestWithRSVP | null>(null);
  const [sendingInviteId, setSendingInviteId] = useState<string | null>(null);

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
        setGuests(guestsWithRsvps);
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

        setGuests(guestsWithRsvps);
      }
    } catch (err) {
      console.error('Error fetching guests:', err);
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

  const generateInviteToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weddingSiteId) return;

    try {
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
          invite_token: generateInviteToken(),
          rsvp_status: 'pending',
        }]);

      if (error) throw error;

      await fetchGuests();
      setShowAddModal(false);
      resetForm();
      toast(`${formData.first_name} ${formData.last_name} added`, 'success');
    } catch (err) {
      console.error('Error adding guest:', err);
      toast('Failed to add guest. Please try again.', 'error');
    }
  };

  const handleEditGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuest) return;

    try {
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
    } catch (err) {
      console.error('Error updating guest:', err);
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
      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', guestId);

      if (error) throw error;

      await fetchGuests();
      toast('Guest removed', 'success');
    } catch (err) {
      console.error('Error deleting guest:', err);
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
      toast('Email sending is disabled in demo mode', 'warning');
      return;
    }

    setSendingInviteId(guest.id);
    try {
      const guestName = guest.first_name && guest.last_name
        ? `${guest.first_name} ${guest.last_name}`
        : guest.name;

      const res = await sendWeddingInvitation({
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

      if (res.ok) {
        await supabase
          .from('guests')
          .update({ invitation_sent_at: new Date().toISOString() })
          .eq('id', guest.id);

        toast(`Invitation sent to ${guestName}`, 'success');
      } else {
        toast('Failed to send invitation. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Error sending invitation:', err);
      toast('Failed to send invitation. Please try again.', 'error');
    } finally {
      setSendingInviteId(null);
    }
  };

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
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());

      const guestsToImport = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.replace(/"/g, '').trim());
          const guest: Record<string, unknown> = {
            wedding_site_id: weddingSiteId,
            rsvp_status: 'pending',
            invite_token: generateInviteToken(),
            plus_one_allowed: false,
            invited_to_ceremony: true,
            invited_to_reception: true,
          };

          headers.forEach((header, index) => {
            const value = values[index];
            if (header === 'first name') guest.first_name = value;
            if (header === 'last name') guest.last_name = value;
            if (header === 'email') guest.email = value || null;
            if (header === 'phone') guest.phone = value || null;
            if (header === 'plus one') guest.plus_one_allowed = value.toLowerCase() === 'yes';
          });

          guest.name = `${guest.first_name || ''} ${guest.last_name || ''}`.trim();
          return guest;
        });

      try {
        const { error } = await supabase
          .from('guests')
          .insert(guestsToImport);

        if (error) throw error;

        await fetchGuests();
        toast(`${guestsToImport.length} guest${guestsToImport.length !== 1 ? 's' : ''} imported successfully`, 'success');
      } catch (err) {
        console.error('Error importing guests:', err);
        toast('Failed to import guests. Check the CSV format and try again.', 'error');
      }
    };

    reader.readAsText(file);
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

            <div className="flex gap-2 flex-wrap">
              {([
                { id: 'all', label: `All (${stats.total})` },
                { id: 'confirmed', label: `Confirmed (${stats.confirmed})` },
                { id: 'declined', label: `Declined (${stats.declined})` },
                { id: 'pending', label: `Pending (${stats.pending})` },
              ] as const).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setFilterStatus(id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === id
                      ? 'bg-primary text-text-inverse'
                      : 'bg-surface-subtle text-text-secondary hover:bg-surface hover:text-text-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

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
                    <tr key={guest.id} className="hover:bg-surface-subtle transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-text-primary">
                            {guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.name}
                          </p>
                          <p className="text-sm text-text-secondary">{guest.email || '—'}</p>
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
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
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
    </DashboardLayout>
  );
};
