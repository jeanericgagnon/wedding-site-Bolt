import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, Mail, MapPin, MessageSquare, Send, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [siteSlug, setSiteSlug] = useState('');
  const [guests, setGuests] = useState<PlanningAddressGuest[]>([]);
  const [view, setView] = useState<'missing-address' | 'missing-contact' | 'all'>('missing-address');
  const [copyingKey, setCopyingKey] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState<{ key: string; mode: 'copied' | 'downloaded' } | null>(null);
  const copyNoticeTimeoutRef = useRef<number | null>(null);
  const copyActionRequestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const copyContextRef = useRef('');

  useEffect(() => () => {
    mountedRef.current = false;
    copyActionRequestIdRef.current += 1;
    if (copyNoticeTimeoutRef.current) window.clearTimeout(copyNoticeTimeoutRef.current);
  }, []);

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
  const copyContextKey = JSON.stringify({
    siteId,
    collectionUrl,
    view,
    guests: guests.map((guest) => [
      guest.id,
      guest.name,
      guest.email ?? null,
      guest.phone ?? null,
      guest.household_id ?? null,
      guest.mailing_address_line1 ?? null,
      guest.mailing_city ?? null,
    ]),
  });
  copyContextRef.current = copyContextKey;

  useEffect(() => {
    copyActionRequestIdRef.current += 1;
    setCopyingKey(null);
    setCopyNotice(null);
    if (copyNoticeTimeoutRef.current) window.clearTimeout(copyNoticeTimeoutRef.current);
  }, [copyContextKey]);

  const stats = useMemo(() => {
    const missingAddress = guests.filter((guest) => !guest.mailing_address_line1);
    const missingContact = guests.filter((guest) => !guest.email && !guest.phone);
    const households = new Set(guests.map((guest) => guest.household_id).filter(Boolean)).size;
    const reachable = guests.filter((guest) => guest.email || guest.phone).length;
    const complete = guests.filter((guest) => Boolean(guest.mailing_address_line1 && (guest.email || guest.phone))).length;
    return { missingAddress, missingContact, households, reachable, complete };
  }, [guests]);

  async function runCopyAction(copyKey: string, text: string, label: string, fileName: string) {
    if (copyingKey) return;
    const requestId = ++copyActionRequestIdRef.current;
    const requestContextKey = copyContextRef.current;
    const isCurrentCopyAction = () => (
      mountedRef.current &&
      requestId === copyActionRequestIdRef.current &&
      copyContextRef.current === requestContextKey
    );

    setCopyingKey(copyKey);
    try {
      const result = await copyTextOrDownload(text, fileName);
      if (!isCurrentCopyAction()) return;
      setCopyNotice({ key: copyKey, mode: result });
      if (result === 'copied') {
        toast(`${label} copied.`, 'success');
      } else {
        toast(`Clipboard was blocked, so ${label.toLowerCase()} downloaded.`, 'success');
      }
      if (copyNoticeTimeoutRef.current) window.clearTimeout(copyNoticeTimeoutRef.current);
      copyNoticeTimeoutRef.current = window.setTimeout(() => setCopyNotice((current) => (current?.key === copyKey ? null : current)), 1800);
    } catch {
      if (!isCurrentCopyAction()) return;
      toast(`Couldn’t copy ${label.toLowerCase()} right now.`, 'error');
    } finally {
      if (isCurrentCopyAction()) {
        setCopyingKey((current) => (current === copyKey ? null : current));
      }
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
    navigate({
      pathname: '/dashboard/messages',
      search: `?${params.toString()}`,
    });
  }

  async function copyFollowUpList() {
    const text = uniqueFollowUpGuests.map((guest) => `${guest.name} — ${guest.email || guest.phone || 'no direct contact'}${guest.household_id ? ' — household' : ''}`).join('\n');
    await runCopyAction('follow-ups', text || 'No follow-ups needed.', 'Follow-up list', 'dayof-address-follow-ups.txt');
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
            <Button size="sm" variant="outline" onClick={() => void copyFollowUpList()} disabled={copyingKey === 'follow-ups'}>
              <Copy className="w-4 h-4 mr-1" />
              {copyingKey === 'follow-ups'
                ? 'Copying...'
                : copyNotice?.key === 'follow-ups'
                  ? copyNotice.mode === 'downloaded'
                    ? 'Downloaded guest follow-ups'
                    : 'Copied guest follow-ups'
                  : 'Copy follow-ups'}
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-xl bg-surface-subtle">
          <div className="h-full rounded-xl bg-success" style={{ width: `${guests.length > 0 ? Math.round((stats.complete / guests.length) * 100) : 0}%` }} />
        </div>
      </Card>

      <Card padding="md" className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary-light p-2">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Collect addresses</p>
            <p className="text-sm text-text-secondary mt-1">Send guests one easy link. They can search their name, update contact info, add a mailing address, and apply it to their household.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-surface-subtle/40 px-3 py-2 text-sm text-text-primary break-all">
          {collectionUrl || 'Add a site slug before sharing this link.'}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => collectionUrl && void runCopyAction('address-link', collectionUrl, 'Address link', 'dayof-address-link.txt')} disabled={!collectionUrl || copyingKey === 'address-link'}>
            <Copy className="w-4 h-4 mr-1" />
            {copyingKey === 'address-link'
              ? 'Copying...'
              : copyNotice?.key === 'address-link'
                ? copyNotice.mode === 'downloaded'
                  ? 'Downloaded address link'
                  : 'Copied address link'
                : 'Copy link'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void runCopyAction('email-copy', emailTemplate, 'Email copy', 'dayof-email-copy.txt')} disabled={!collectionUrl || copyingKey === 'email-copy'}>
            <Mail className="w-4 h-4 mr-1" />
            {copyingKey === 'email-copy'
              ? 'Copying...'
              : copyNotice?.key === 'email-copy'
                ? copyNotice.mode === 'downloaded'
                  ? 'Downloaded email copy'
                  : 'Copied email copy'
                : 'Copy email copy'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void runCopyAction('text-copy', emailTemplate.slice(0, 155), 'Text copy', 'dayof-text-copy.txt')} disabled={!collectionUrl || copyingKey === 'text-copy'}>
            <MessageSquare className="w-4 h-4 mr-1" />
            {copyingKey === 'text-copy'
              ? 'Copying...'
              : copyNotice?.key === 'text-copy'
                ? copyNotice.mode === 'downloaded'
                  ? 'Downloaded text copy'
                  : 'Copied text copy'
                : 'Copy text copy'}
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
              className="rounded-xl border border-border-subtle bg-surface px-2 py-1 text-xs text-text-secondary"
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
