import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, CardContent, Button, Badge, Input } from '../../components/ui';
import { Search, Download, UserPlus, Mail, Filter, CheckCircle2, XCircle, Clock, X, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { demoWeddingSite, demoGuests, demoRSVPs } from '../../lib/demoData';

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

export const DashboardGuests: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const [guests, setGuests] = useState<GuestWithRSVP[]>([]);
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'declined' | 'pending'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<GuestWithRSVP | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    plus_one_allowed: false,
    invited_to_ceremony: true,
    invited_to_reception: true,
  });

  useEffect(() => {
    fetchWeddingSite();
  }, [user, isDemoMode]);

  useEffect(() => {
    if (weddingSiteId) {
      fetchGuests();
    }
  }, [weddingSiteId]);

  const fetchWeddingSite = async () => {
    if (!user) return;

    if (isDemoMode) {
      setWeddingSiteId(demoWeddingSite.id);
      return;
    }

    const { data, error } = await supabase
      .from('wedding_sites')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setWeddingSiteId(data.id);
    }
  };

  const fetchGuests = async () => {
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
  };

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
    } catch (err) {
      console.error('Error adding guest:', err);
      alert('Failed to add guest');
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
    } catch (err) {
      console.error('Error updating guest:', err);
      alert('Failed to update guest');
    }
  };

  const handleDeleteGuest = async (guestId: string) => {
    if (!confirm('Are you sure you want to delete this guest?')) return;

    try {
      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', guestId);

      if (error) throw error;

      await fetchGuests();
    } catch (err) {
      console.error('Error deleting guest:', err);
      alert('Failed to delete guest');
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
          const guest: any = {
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
        alert(`Successfully imported ${guestsToImport.length} guests`);
      } catch (err) {
        console.error('Error importing guests:', err);
        alert('Failed to import guests');
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
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name *</label>
              <Input
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name *</label>
              <Input
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
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
                <span className="text-sm">Allow Plus One</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.invited_to_ceremony}
                  onChange={(e) => setFormData({ ...formData, invited_to_ceremony: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Invited to Ceremony</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.invited_to_reception}
                  onChange={(e) => setFormData({ ...formData, invited_to_reception: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Invited to Reception</span>
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
          <p>Loading guests...</p>
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
              <div className="p-3 bg-green-100 rounded-lg flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.confirmed}</p>
                <p className="text-sm text-gray-600">Confirmed</p>
              </div>
            </div>
          </Card>

          <Card variant="bordered" padding="md">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg flex-shrink-0">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.declined}</p>
                <p className="text-sm text-gray-600">Declined</p>
              </div>
            </div>
          </Card>

          <Card variant="bordered" padding="md">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg flex-shrink-0">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>
          </Card>

          <Card variant="bordered" padding="md">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-600">Total ({stats.rsvpRate}% responded)</p>
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
                  <Button variant="outline" size="md" as="span">
                    <Upload className="w-4 h-4 mr-2" />
                    Import CSV
                  </Button>
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
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setFilterStatus('confirmed')}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  filterStatus === 'confirmed'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Confirmed ({stats.confirmed})
              </button>
              <button
                onClick={() => setFilterStatus('declined')}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  filterStatus === 'declined'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Declined ({stats.declined})
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  filterStatus === 'pending'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending ({stats.pending})
              </button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Guest</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Plus One</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Meal Choice</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Invite Code</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredGuests.map((guest) => (
                    <tr key={guest.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">
                            {guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.name}
                          </p>
                          <p className="text-sm text-gray-500">{guest.email || '—'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(guest.rsvp_status)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {guest.plus_one_allowed ? (guest.rsvp?.plus_one_name || 'Allowed') : 'No'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {guest.rsvp?.meal_choice || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {guest.invite_token || '—'}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(guest)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteGuest(guest.id)}>
                            Delete
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
                <p className="text-gray-500">No guests found. Add your first guest to get started!</p>
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
