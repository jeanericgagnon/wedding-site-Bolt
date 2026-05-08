import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Download, Mail, MapPin, MessageSquare, Send, Users } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { copyTextOrDownload } from '../../../lib/copyText';
import { loadAddressCollectionData, type PlanningAddressGuest } from './planningService';

interface Props {
  siteId: string | null;
  isDemoMode?: boolean;
}

export const AddressCollectionTab: React.FC<Props> = ({ siteId, isDemoMode = false }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [siteSlug, setSiteSlug] = useState('');
  const [guests, setGuests] = useState<PlanningAddressGuest[]>([]);
  const [view, setView] = useState<'missing-address' | 'missing-contact' | 'all'>('missing-address');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!siteId) return;
      setLoading(true);
      try {
        if (isDemoMode) {
          setSiteSlug('alex-jordan-demo');
          setGuests([
            { id: 'demo-1', name: 'Sarah Mitchell', email: 'sarah@example.com', phone: null, household_id: 'house-1', mailing_address_line1: null, mailing_city: null },
            { id: 'demo-2', name: 'Michael Chen', email: null, phone: '(555) 010-0102', household_id: null, mailing_address_line1: '14 Oak St', mailing_city: 'Boston' },
          ]);
          return;
        }
        const { siteSlug: nextSiteSlug, guests: nextGuests } = await loadAddressCollectionData(siteId);
        if (cancelled) return;
        setSiteSlug(nextSiteSlug);
        setGuests(nextGuests);
      } catch {
        toast('Couldn’t load guest address status right now.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [siteId, isDemoMode, toast]);

  const collectionUrl = siteSlug
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://dayof.love'}/guest-contact/${siteSlug}`
    : '';

  const stats = useMemo(() => {
    const missingAddress = guests.filter((guest) => !guest.mailing_address_line1);
    const missingContact = guests.filter((guest) => !guest.email && !guest.phone);
    const households = new Set(guests.map((guest) => guest.household_id).filter(Boolean)).size;
    const reachable = guests.filter((guest) => guest.email || guest.phone).length;
    const complete = guests.filter((guest) => Boolean(guest.mailing_address_line1 && (guest.email || guest.phone))).length;
    return { missingAddress, missingContact, households, reachable, complete };
  }, [guests]);

  async function copyText(text: string, label: string) {
    const result = await copyTextOrDownload(text, `dayof-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`);
    if (result === 'copied') {
      toast(`${label} copied.`, 'success');
    } else {
      toast(`Clipboard was blocked, so ${label.toLowerCase()} downloaded.`, 'success');
    }
  }

  const emailTemplate = `Hi! We are collecting mailing addresses and contact details for the wedding. Please update yours here: ${collectionUrl}`;
  const followUpGuests = view === 'missing-contact'
    ? stats.missingContact
    : view === 'all'
      ? guests
      : stats.missingAddress;
  const uniqueFollowUpGuests = [...stats.missingContact, ...stats.missingAddress.filter((guest) => !stats.missingContact.some((missing) => missing.id === guest.id))];

  function openMessageComposer(channel: 'email' | 'sms') {
    const params = new URLSearchParams({
      prefillCampaignName: 'Address collection',
      prefillSubject: 'Quick wedding address update',
      prefillBody: emailTemplate,
      prefillAudience: 'all',
      prefillChannel: channel,
    });
    window.location.href = `/dashboard/messages?${params.toString()}`;
  }

  async function copyFollowUpList() {
    const text = uniqueFollowUpGuests.map((guest) => `${guest.name} — ${guest.email || guest.phone || 'no direct contact'}${guest.household_id ? ' — household' : ''}`).join('\n');
    const result = await copyTextOrDownload(text || 'No follow-ups needed.', 'dayof-address-follow-ups.txt');
    if (result === 'copied') {
      toast('Follow-up list copied.', 'success');
    } else {
      toast('Clipboard was blocked, so the follow-up list downloaded.', 'success');
    }
  }

  function exportCsv() {
    const csvRows = [
      ['Name', 'Email', 'Phone', 'Household ID', 'Needs address', 'Needs contact'],
      ...guests.map((guest) => [
        guest.name,
        guest.email ?? '',
        guest.phone ?? '',
        guest.household_id ?? '',
        guest.mailing_address_line1 ? 'no' : 'yes',
        guest.email || guest.phone ? 'no' : 'yes',
      ]),
    ];
    const csv = csvRows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `dayof-address-list-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card padding="sm">
          <p className="text-xs text-text-tertiary mb-0.5">Guests</p>
          <p className="text-xl font-bold text-text-primary">{guests.length}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-text-tertiary mb-0.5">Need address</p>
          <p className="text-xl font-bold text-text-primary">{stats.missingAddress.length}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-text-tertiary mb-0.5">Need contact</p>
          <p className="text-xl font-bold text-text-primary">{stats.missingContact.length}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-text-tertiary mb-0.5">Households</p>
          <p className="text-xl font-bold text-text-primary">{stats.households}</p>
        </Card>
      </div>

      <Card padding="sm" className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-text-primary">Address progress</p>
            <p className="text-sm text-text-secondary mt-0.5">{stats.complete} guest{stats.complete === 1 ? '' : 's'} have address plus at least one contact method.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={copyFollowUpList}>
              <Copy className="w-4 h-4 mr-1" />
              Copy follow-ups
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-lg bg-surface-subtle">
          <div className="h-full rounded-lg bg-success" style={{ width: `${guests.length > 0 ? Math.round((stats.complete / guests.length) * 100) : 0}%` }} />
        </div>
      </Card>

      <Card padding="md" className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary-light p-2">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Collect addresses</p>
            <p className="text-sm text-text-secondary mt-1">Send guests one easy link. They can search their name, update contact info, add a mailing address, and apply it to their household.</p>
          </div>
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 px-3 py-2 text-sm text-text-primary break-all">
          {collectionUrl || 'Add a site slug before sharing this link.'}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => collectionUrl && copyText(collectionUrl, 'address link')} disabled={!collectionUrl}>
            <Copy className="w-4 h-4 mr-1" />
            Copy link
          </Button>
          <Button size="sm" variant="outline" onClick={() => copyText(emailTemplate, 'email copy')} disabled={!collectionUrl}>
            <Mail className="w-4 h-4 mr-1" />
            Copy email copy
          </Button>
          <Button size="sm" variant="outline" onClick={() => copyText(emailTemplate.slice(0, 155), 'text copy')} disabled={!collectionUrl}>
            <MessageSquare className="w-4 h-4 mr-1" />
            Copy text copy
          </Button>
          <Button size="sm" variant="outline" onClick={() => openMessageComposer('email')} disabled={!collectionUrl}>
            <Send className="w-4 h-4 mr-1" />
            Draft email
          </Button>
          <Button size="sm" variant="outline" onClick={() => openMessageComposer('sms')} disabled={!collectionUrl}>
            <MessageSquare className="w-4 h-4 mr-1" />
            Draft SMS
          </Button>
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-border-subtle px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-text-primary">Needs follow-up</p>
            <p className="text-xs text-text-tertiary">{loading ? 'Loading…' : `${stats.missingAddress.length} missing address · ${stats.missingContact.length} missing contact`}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={view}
              onChange={(event) => setView(event.target.value as typeof view)}
              className="rounded-lg border border-border-subtle bg-surface px-2 py-1 text-xs text-text-secondary"
            >
              <option value="missing-address">Addresses</option>
              <option value="missing-contact">Contact info</option>
              <option value="all">All guests</option>
            </select>
            <Users className="w-4 h-4 text-text-tertiary" />
          </div>
        </div>
        {stats.missingAddress.length === 0 && stats.missingContact.length === 0 ? (
          <div className="p-6 text-center text-sm text-text-tertiary">Everyone has enough contact and address info for now.</div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {followUpGuests.slice(0, 40).map((guest) => (
              <div key={guest.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{guest.name}</p>
                  <p className="text-xs text-text-tertiary">
                    {!guest.email && !guest.phone ? 'Missing email/phone' : 'Missing mailing address'}
                    {guest.household_id ? ' · household aware' : ''}
                  </p>
                </div>
                <p className="text-xs text-text-tertiary text-right">{guest.email || guest.phone || 'No direct contact'}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
