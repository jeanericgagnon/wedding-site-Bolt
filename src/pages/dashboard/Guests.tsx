import React, { useState } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, CardContent, Button, Badge, Input } from '../../components/ui';
import { Search, Download, UserPlus, Mail, Filter, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface Guest {
  id: string;
  name: string;
  email: string;
  status: 'confirmed' | 'declined' | 'pending';
  plusOne: boolean;
  mealChoice?: string;
  dietaryRestrictions?: string;
  rsvpDate?: string;
}

export const DashboardGuests: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'declined' | 'pending'>('all');

  const guests: Guest[] = [
    {
      id: '1',
      name: 'Sarah Miller',
      email: 'sarah.miller@example.com',
      status: 'confirmed',
      plusOne: true,
      mealChoice: 'Vegetarian',
      dietaryRestrictions: 'None',
      rsvpDate: '2026-04-15',
    },
    {
      id: '2',
      name: 'David Chen',
      email: 'david.chen@example.com',
      status: 'confirmed',
      plusOne: false,
      mealChoice: 'Chicken',
      dietaryRestrictions: 'None',
      rsvpDate: '2026-04-14',
    },
    {
      id: '3',
      name: 'Emily Rodriguez',
      email: 'emily.r@example.com',
      status: 'declined',
      plusOne: false,
      rsvpDate: '2026-04-12',
    },
    {
      id: '4',
      name: 'Michael Thompson',
      email: 'mthompson@example.com',
      status: 'pending',
      plusOne: true,
    },
    {
      id: '5',
      name: 'Jessica Park',
      email: 'jessica.park@example.com',
      status: 'confirmed',
      plusOne: false,
      mealChoice: 'Fish',
      dietaryRestrictions: 'Gluten-free',
      rsvpDate: '2026-04-18',
    },
  ];

  const filteredGuests = guests.filter((guest) => {
    const matchesSearch = guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          guest.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || guest.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: guests.length,
    confirmed: guests.filter(g => g.status === 'confirmed').length,
    declined: guests.filter(g => g.status === 'declined').length,
    pending: guests.filter(g => g.status === 'pending').length,
  };

  const getStatusBadge = (status: Guest['status']) => {
    const variants = {
      confirmed: 'success' as const,
      declined: 'error' as const,
      pending: 'warning' as const,
    };
    const labels = {
      confirmed: 'Confirmed',
      declined: 'Declined',
      pending: 'Pending',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getStatusIcon = (status: Guest['status']) => {
    const icons = {
      confirmed: <CheckCircle2 className="w-5 h-5 text-success" aria-hidden="true" />,
      declined: <XCircle className="w-5 h-5 text-error" aria-hidden="true" />,
      pending: <Clock className="w-5 h-5 text-warning" aria-hidden="true" />,
    };
    return icons[status];
  };

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
              <div className="p-3 bg-primary-light rounded-lg flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-primary" aria-hidden="true" />
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
              <div className="p-3 bg-accent-light rounded-lg flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-accent" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
                <p className="text-sm text-text-secondary">Total Invited</p>
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
                <Button variant="outline" size="md">
                  <Filter className="w-4 h-4 mr-2" aria-hidden="true" />
                  Filter
                </Button>
                <Button variant="outline" size="md">
                  <Download className="w-4 h-4 mr-2" aria-hidden="true" />
                  Export
                </Button>
                <Button variant="primary" size="md">
                  <UserPlus className="w-4 h-4 mr-2" aria-hidden="true" />
                  Add Guest
                </Button>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-primary text-text-inverse'
                    : 'bg-surface-subtle text-text-secondary hover:bg-surface'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setFilterStatus('confirmed')}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  filterStatus === 'confirmed'
                    ? 'bg-success text-text-inverse'
                    : 'bg-surface-subtle text-text-secondary hover:bg-surface'
                }`}
              >
                Confirmed ({stats.confirmed})
              </button>
              <button
                onClick={() => setFilterStatus('declined')}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  filterStatus === 'declined'
                    ? 'bg-error text-text-inverse'
                    : 'bg-surface-subtle text-text-secondary hover:bg-surface'
                }`}
              >
                Declined ({stats.declined})
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  filterStatus === 'pending'
                    ? 'bg-warning text-text-inverse'
                    : 'bg-surface-subtle text-text-secondary hover:bg-surface'
                }`}
              >
                Pending ({stats.pending})
              </button>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-surface-subtle border-b border-border">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-primary">Guest</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-primary">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-primary">Plus One</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-primary">Meal Choice</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-primary">RSVP Date</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-text-primary">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredGuests.map((guest) => (
                    <tr key={guest.id} className="hover:bg-surface-subtle transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-text-primary">{guest.name}</p>
                          <p className="text-sm text-text-secondary">{guest.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(guest.status)}
                      </td>
                      <td className="px-6 py-4 text-text-secondary">
                        {guest.plusOne ? 'Yes' : 'No'}
                      </td>
                      <td className="px-6 py-4 text-text-secondary">
                        {guest.mealChoice || '—'}
                      </td>
                      <td className="px-6 py-4 text-text-secondary">
                        {guest.rsvpDate ? new Date(guest.rsvpDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Mail className="w-4 h-4" aria-hidden="true" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            Edit
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
                <p className="text-text-secondary">No guests found matching your search.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};
