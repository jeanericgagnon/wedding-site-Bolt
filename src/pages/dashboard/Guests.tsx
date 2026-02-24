import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, Button, Badge, Input, Select } from '../../components/ui';
import { Download, UserPlus, CheckCircle2, XCircle, Clock, X, Upload, Users, Mail, AlertCircle, Merge, Scissors, Home, CalendarDays, ChevronRight, Loader2, Copy, ChevronDown, PlusCircle, Pencil, Trash2 } from 'lucide-react';
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
  custom_answers?: Record<string, string | string[]> | null;
}

interface GuestWithRSVP extends Guest {
  rsvp?: RSVP;
}

interface GuestAuditEntry {
  id: string;
  action: 'insert' | 'update' | 'delete';
  changed_at: string;
  changed_by: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

function formatAuditValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function summarizeAuditEntry(entry: GuestAuditEntry): string {
  if (entry.action === 'insert') return 'Guest created';
  if (entry.action === 'delete') return 'Guest removed';

  const oldData = entry.old_data ?? {};
  const newData = entry.new_data ?? {};

  const watched: Array<{ key: string; label: string }> = [
    { key: 'rsvp_status', label: 'RSVP status' },
    { key: 'first_name', label: 'First name' },
    { key: 'last_name', label: 'Last name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'plus_one_allowed', label: 'Plus-one allowed' },
    { key: 'plus_one_name', label: 'Plus-one name' },
    { key: 'invited_to_ceremony', label: 'Ceremony invite' },
    { key: 'invited_to_reception', label: 'Reception invite' },
    { key: 'household_id', label: 'Household' },
  ];

  const changes = watched
    .filter(({ key }) => oldData[key] !== newData[key])
    .slice(0, 2)
    .map(({ key, label }) => `${label}: ${formatAuditValue(oldData[key])} → ${formatAuditValue(newData[key])}`);

  if (changes.length === 0) return 'Guest details updated';
  return changes.join(' · ');
}

function getAuditActionTone(action: GuestAuditEntry['action']): string {
  if (action === 'insert') return 'bg-success-light text-success border-success/20';
  if (action === 'delete') return 'bg-error-light text-error border-error/20';
  return 'bg-primary-light text-primary border-primary/20';
}

function formatRelativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getAuditActionIcon(action: GuestAuditEntry['action']) {
  if (action === 'insert') return PlusCircle;
  if (action === 'delete') return Trash2;
  return Pencil;
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



function getCustomAnswerEntries(customAnswers: Record<string, string | string[]> | null | undefined): Array<{ key: string; value: string }> {
  if (!customAnswers || typeof customAnswers !== 'object') return [];

  return Object.entries(customAnswers)
    .map(([key, value]) => ({
      key: key.replace(/^q_/, 'question_'),
      value: Array.isArray(value) ? value.join(', ').trim() : (typeof value === 'string' ? value : String(value ?? '')).trim(),
    }))
    .filter((entry) => entry.value.length > 0);
}

function formatCustomAnswers(customAnswers: Record<string, string | string[]> | null | undefined): string {
  if (!customAnswers || typeof customAnswers !== 'object') return '';
  const entries = Object.entries(customAnswers)
    .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : String(value ?? '').trim()] as const)
    .filter(([, value]) => value.length > 0);

  if (entries.length === 0) return '';

  return entries
    .map(([key, value]) => `${key.replace(/^q_/, 'question_')}: ${value}`)
    .join(' | ');
}

interface WeddingSiteInfo {
  couple_name_1: string;
  couple_name_2: string;
  wedding_date: string | null;
  venue_name: string | null;
  venue_address: string | null;
  site_url: string | null;
}

const RSVP_CAMPAIGN_LOG_KEY = 'dayof_rsvp_campaign_log_v1';
const RSVP_FOLLOWUP_TASKS_KEY = 'dayof_rsvp_followup_tasks_v1';
const RSVP_CAMPAIGN_PRESET_KEY = 'dayof_rsvp_campaign_preset_v1';
const RSVP_SAVED_SEGMENTS_KEY = 'dayof_rsvp_saved_segments_v1';


interface RSVPQuestionSetting {
  id: string;
  label: string;
  type: 'short_text' | 'long_text' | 'single_choice' | 'multi_choice';
  required: boolean;
  appliesTo: 'all' | 'ceremony' | 'reception';
  options?: string[];
}

const makeRsvpQuestion = (): RSVPQuestionSetting => ({
  id: `q_${Math.random().toString(36).slice(2, 10)}`,
  label: '',
  type: 'short_text',
  required: false,
  appliesTo: 'all',
  options: [],
});

const toTitleCase = (value: string) => value.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());

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
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'declined' | 'pending' | 'ceremony-no' | 'reception-no' | 'missing-meal' | 'plusone-missing' | 'pending-no-email' | 'no-contact'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<GuestWithRSVP | null>(null);
  const [sendingInviteId, setSendingInviteId] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [campaignLog, setCampaignLog] = useState<Array<{ id: number; segment: string; count: number; sentAt: string }>>([]);
  const [showRecipientPreview, setShowRecipientPreview] = useState(false);
  const [campaignPreset, setCampaignPreset] = useState<'pending' | 'missing-meal' | 'plusone-missing' | 'ceremony-no' | 'reception-no' | 'pending-no-email'>('pending');
  const [followUpTasks, setFollowUpTasks] = useState<Array<{ id: number; text: string; createdAt: string }>>([]);
  const [sortByPriority, setSortByPriority] = useState(true);
  const [savedSegments, setSavedSegments] = useState<Array<{ id: number; label: string; filter: string; createdAt: string }>>([]);
  const [guestsTab, setGuestsTab] = useState<'ops' | 'rsvp-config'>('ops');
  const [rsvpQuestions, setRsvpQuestions] = useState<RSVPQuestionSetting[]>([]);
  const [rsvpMealEnabled, setRsvpMealEnabled] = useState(true);
  const [rsvpMealOptions, setRsvpMealOptions] = useState<string[]>(['Chicken','Beef','Fish','Vegetarian','Vegan']);
  const [rsvpConfigSaving, setRsvpConfigSaving] = useState(false);
  const [rsvpAutoSaveState, setRsvpAutoSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [rsvpConfigDirty, setRsvpConfigDirty] = useState(false);
  const rsvpConfigLoadedRef = useRef(false);


  useEffect(() => {
    try {
      const rawPreset = localStorage.getItem(RSVP_CAMPAIGN_PRESET_KEY);
      if (rawPreset) {
        const preset = rawPreset as typeof campaignPreset;
        setCampaignPreset(preset);
        setFilterStatus(preset);
      }
    } catch {
      // noop
    }

    try {
      const rawTasks = localStorage.getItem(RSVP_FOLLOWUP_TASKS_KEY);
      const parsed = rawTasks ? JSON.parse(rawTasks) : [];
      if (Array.isArray(parsed)) setFollowUpTasks(parsed.slice(0, 12));
    } catch {
      // noop
    }

    try {
      const rawSeg = localStorage.getItem(RSVP_SAVED_SEGMENTS_KEY);
      const parsed = rawSeg ? JSON.parse(rawSeg) : [];
      if (Array.isArray(parsed)) setSavedSegments(parsed.slice(0, 12));
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(RSVP_CAMPAIGN_PRESET_KEY, campaignPreset);
    } catch {
      // noop
    }
  }, [campaignPreset]);

  useEffect(() => {
    try {
      localStorage.setItem(RSVP_FOLLOWUP_TASKS_KEY, JSON.stringify(followUpTasks.slice(0, 12)));
    } catch {
      // noop
    }
  }, [followUpTasks]);

  useEffect(() => {
    try {
      localStorage.setItem(RSVP_SAVED_SEGMENTS_KEY, JSON.stringify(savedSegments.slice(0, 12)));
    } catch {
      // noop
    }
  }, [savedSegments]);


  useEffect(() => {
    try {
      const raw = localStorage.getItem(RSVP_CAMPAIGN_LOG_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setCampaignLog(parsed.slice(0, 12));
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(RSVP_CAMPAIGN_LOG_KEY, JSON.stringify(campaignLog.slice(0, 12)));
    } catch {
      // noop
    }
  }, [campaignLog]);

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
  const [guestAuditEntries, setGuestAuditEntries] = useState<GuestAuditEntry[]>([]);

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
      try {
        const rawQ = localStorage.getItem('dayof_demo_rsvp_custom_questions_v1');
        const parsedQ = rawQ ? JSON.parse(rawQ) : [];
        if (Array.isArray(parsedQ)) setRsvpQuestions(parsedQ as RSVPQuestionSetting[]);
        const rawM = localStorage.getItem('dayof_demo_rsvp_meal_config_v1');
        const parsedM = rawM ? JSON.parse(rawM) : null;
        if (parsedM && typeof parsedM === 'object') {
          setRsvpMealEnabled(typeof parsedM.enabled === 'boolean' ? parsedM.enabled : true);
          setRsvpMealOptions(Array.isArray(parsedM.options) ? parsedM.options.filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0) : ['Chicken','Beef','Fish','Vegetarian','Vegan']);
        }
      } catch {}
      rsvpConfigLoadedRef.current = true;
      return;
    }

    const { data } = await supabase
      .from('wedding_sites')
      .select('id, couple_name_1, couple_name_2, wedding_date, venue_name, venue_address, site_url, rsvp_custom_questions, rsvp_meal_config')
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
      const loadedQuestions = Array.isArray((data as { rsvp_custom_questions?: unknown }).rsvp_custom_questions) ? ((data as { rsvp_custom_questions?: unknown[] }).rsvp_custom_questions || []) : [];
      const normalized = loadedQuestions
        .map((q) => q as Partial<RSVPQuestionSetting>)
        .filter((q) => typeof q?.id === 'string' && typeof q?.label === 'string')
        .map((q) => ({
          id: q.id as string,
          label: (q.label as string) || '',
          type: (q.type as RSVPQuestionSetting['type']) || 'short_text',
          required: !!q.required,
          appliesTo: (q.appliesTo as RSVPQuestionSetting['appliesTo']) || 'all',
          options: Array.isArray(q.options) ? q.options.filter((x): x is string => typeof x === 'string') : [],
        }));
      setRsvpQuestions(normalized);
      const mealCfg = (data as { rsvp_meal_config?: unknown }).rsvp_meal_config as { enabled?: unknown; options?: unknown } | undefined;
      setRsvpMealEnabled(typeof mealCfg?.enabled === 'boolean' ? mealCfg.enabled : true);
      setRsvpMealOptions(Array.isArray(mealCfg?.options) ? (mealCfg.options as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : ['Chicken','Beef','Fish','Vegetarian','Vegan']);
      rsvpConfigLoadedRef.current = true;
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


  const handleSaveRsvpConfig = async () => {
    setRsvpConfigSaving(true);
    try {
      const cleanedQuestions = rsvpQuestions
        .map((q) => ({
          ...q,
          label: q.label.trim(),
          options: (q.type === 'single_choice' || q.type === 'multi_choice') ? (q.options ?? []).map((o) => o.trim()).filter(Boolean) : [],
        }))
        .filter((q) => q.label.length > 0);

      const missingOptions = cleanedQuestions.find((q) => (q.type === 'single_choice' || q.type === 'multi_choice') && (q.options?.length ?? 0) < 2);
      if (missingOptions) {
        toast(`Choice question "${missingOptions.label}" needs at least 2 options.`, 'error');
        return;
      }

      const mealOptions = rsvpMealOptions.map((o) => toTitleCase(o.trim())).filter(Boolean);
      if (rsvpMealEnabled && mealOptions.length < 2) {
        toast('Meal choices need at least 2 options when enabled.', 'error');
        return;
      }

      if (isDemoMode || !weddingSiteId) {
        localStorage.setItem('dayof_demo_rsvp_custom_questions_v1', JSON.stringify(cleanedQuestions));
        localStorage.setItem('dayof_demo_rsvp_meal_config_v1', JSON.stringify({ enabled: rsvpMealEnabled, options: mealOptions }));
        setRsvpQuestions(cleanedQuestions);
        toast('RSVP config saved (demo).', 'success');
        setRsvpAutoSaveState('saved');
        setRsvpConfigDirty(false);
        return;
      }

      const { error } = await supabase
        .from('wedding_sites')
        .update({ rsvp_custom_questions: cleanedQuestions, rsvp_meal_config: { enabled: rsvpMealEnabled, options: mealOptions } })
        .eq('id', weddingSiteId);
      if (error) throw error;
      setRsvpQuestions(cleanedQuestions);
      toast('RSVP config saved.', 'success');
      setRsvpAutoSaveState('saved');
      setRsvpConfigDirty(false);
    } catch (err) {
      setRsvpAutoSaveState('error');
      toast(err instanceof Error ? err.message : 'Failed to save RSVP config.', 'error');
    } finally {
      setRsvpConfigSaving(false);
    }
  };


  const autoSaveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (guestsTab !== 'rsvp-config') return;
    if (!rsvpConfigLoadedRef.current) return;
    if (!rsvpConfigDirty) return;

    setRsvpAutoSaveState('saving');

    if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = window.setTimeout(() => {
      handleSaveRsvpConfig();
    }, 700);

    return () => {
      if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
    };
  }, [guestsTab, rsvpConfigDirty, rsvpQuestions, rsvpMealEnabled, rsvpMealOptions]);

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



  const handleCopyOpsSummary = async () => {
    const summary = [
      `RSVP Ops Summary (${new Date().toLocaleString()})`,
      `Segment: ${segmentLabelMap[filterStatus] || filterStatus}`,
      `Eligible reminders: ${reminderCandidates.length}`,
      `No response: ${rsvpOps.noResponse}`,
      `Missing meal: ${rsvpOps.missingMeal}`,
      `Plus-one missing: ${rsvpOps.plusOneMissingName}`,
      `Pending no email: ${rsvpOps.pendingNoEmail}`,
      `No contact: ${contactStats.withNoContact}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summary);
      toast('Copied RSVP ops summary', 'success');
    } catch {
      window.prompt('Copy RSVP ops summary:', summary);
    }
  };

  const handleCopyFilteredEmails = async () => {
    const emails = reminderCandidates.map(g => g.email).filter(Boolean) as string[];
    if (emails.length === 0) {
      toast('No emails available in this filtered segment.', 'error');
      return;
    }
    const payload = emails.join(', ');
    try {
      await navigator.clipboard.writeText(payload);
      toast(`Copied ${emails.length} email${emails.length === 1 ? '' : 's'}`, 'success');
    } catch {
      window.prompt('Copy filtered emails:', payload);
    }
  };

  const applyCampaignPreset = (preset: 'pending' | 'missing-meal' | 'plusone-missing' | 'ceremony-no' | 'reception-no' | 'pending-no-email') => {
    setCampaignPreset(preset);
    setFilterStatus(preset);
    setViewMode('list');
    setSearchQuery('');
  };


  const saveCurrentSegment = () => {
    const label = `${segmentLabelMap[filterStatus] || filterStatus} (${filteredGuests.length})`;
    const seg = { id: Date.now(), label, filter: filterStatus, createdAt: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) };
    setSavedSegments((prev) => [seg, ...prev.filter((x) => x.filter !== filterStatus)].slice(0, 12));
    toast('Segment saved', 'success');
  };

  const addFollowUpTask = (text: string) => {
    const task = { id: Date.now(), text, createdAt: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) };
    setFollowUpTasks((prev) => [task, ...prev].slice(0, 6));
    toast('Follow-up task captured', 'success');
  };


  const generateChecklistTasks = () => {
    const tasks: string[] = [];
    if (rsvpOps.noResponse > 0) tasks.push(`Follow up ${rsvpOps.noResponse} pending RSVP(s)`);
    if (rsvpOps.missingMeal > 0) tasks.push(`Collect ${rsvpOps.missingMeal} missing meal choice(s)`);
    if (rsvpOps.plusOneMissingName > 0) tasks.push(`Collect ${rsvpOps.plusOneMissingName} plus-one name(s)`);
    if (rsvpOps.pendingNoEmail > 0) tasks.push(`Add contact details for ${rsvpOps.pendingNoEmail} pending guest(s)`);
    if (contactStats.withNoContact > 0) tasks.push(`Resolve no-contact info for ${contactStats.withNoContact} guest(s)`);

    if (tasks.length === 0) {
      toast('No blockers right now. Great shape!', 'success');
      return;
    }

    const stamped = tasks.map((text, i) => ({
      id: Date.now() + i,
      text,
      createdAt: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    }));

    setFollowUpTasks((prev) => [...stamped, ...prev].slice(0, 12));
    toast(`Generated ${tasks.length} follow-up task${tasks.length === 1 ? '' : 's'}`, 'success');
  };

  const handleSendSelectedInvitations = async () => {
    const selectedRecipients = guests.filter(g => selectedGuestIds.has(g.id) && !!g.email && !!g.invite_token);
    if (selectedRecipients.length === 0) {
      toast('No selected guests with email + invite token.', 'error');
      return;
    }

    if (!window.confirm(`Send reminders to ${selectedRecipients.length} selected guest(s)?`)) return;

    if (isDemoMode) {
      toast(`Demo: simulated reminders for ${selectedRecipients.length} selected guests`, 'success');
      return;
    }

    setBulkSending(true);
    let successCount = 0;
    try {
      for (const guest of selectedRecipients) {
        if (!guest.email) continue;
        const guestName = (guest.first_name || guest.last_name)
          ? `${guest.first_name ?? ''} ${guest.last_name ?? ''}`.trim()
          : guest.name;
        try {
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
          await supabase.from('guests').update({ invitation_sent_at: new Date().toISOString() }).eq('id', guest.id);
          successCount += 1;
        } catch {
          // continue
        }
      }
      toast(successCount > 0 ? `Sent ${successCount} selected reminder${successCount === 1 ? '' : 's'}` : 'No selected reminders were sent.', successCount > 0 ? 'success' : 'error');
    } finally {
      setBulkSending(false);
    }
  };

const handleSendBulkInvitations = async () => {
    if (reminderCandidates.length === 0) {
      toast('No reminder recipients in this filtered view.', 'error');
      return;
    }

    const previewNames = reminderCandidates.slice(0, 3).map((g) => (g.first_name || g.last_name) ? `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim() : g.name);
    const previewText = previewNames.length ? `\n\nFirst recipients: ${previewNames.join(', ')}${reminderCandidates.length > 3 ? ` +${reminderCandidates.length - 3} more` : ''}` : '';
    const noContactWarning = contactStats.withNoContact > 0 ? `\nNo-contact guests in database: ${contactStats.withNoContact} (not included in send)` : '';
    if (!window.confirm(`Reminder dry-run:
Segment: ${segmentLabelMap[filterStatus] || filterStatus}
Recipients: ${reminderCandidates.length}
Skip recent (24h): ${skipRecentlyInvited ? "On" : "Off"}${noContactWarning}${previewText}

Proceed with send?`)) return;

    if (isDemoMode) {
      const sentAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setCampaignLog(prev => [{ id: Date.now(), segment: segmentLabelMap[filterStatus] || filterStatus, count: reminderCandidates.length, sentAt }, ...prev].slice(0, 6));
      toast(`Demo: simulated reminders for ${reminderCandidates.length} guests`, 'success');
      return;
    }

    setBulkSending(true);
    let successCount = 0;

    try {
      for (const guest of reminderCandidates) {
        if (!guest.email) continue;
        const guestName = guest.first_name && guest.last_name
          ? `${guest.first_name} ${guest.last_name}`
          : guest.name;

        try {
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

          successCount += 1;
        } catch {
          // continue sending others
        }
      }

      if (successCount > 0) {
        const sentAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setCampaignLog(prev => [{ id: Date.now(), segment: segmentLabelMap[filterStatus] || filterStatus, count: successCount, sentAt }, ...prev].slice(0, 6));
        toast(`Sent ${successCount} reminder${successCount === 1 ? '' : 's'}`, 'success');
      } else {
        toast('No reminders were sent. Please try again.', 'error');
      }
    } finally {
      setBulkSending(false);
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

  async function copyContactRequestLink(_guest: GuestWithRSVP) {
    if (!weddingSiteId) {
      toast('Missing wedding site context', 'error');
      return;
    }

    const base = import.meta.env.BASE_URL || '/';
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    const url = `${window.location.origin}${normalizedBase}guest-contact/${weddingSiteId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast('Contact update link copied', 'success');
    } catch {
      window.prompt('Copy contact link:', url);
    }
  }

  async function openItineraryDrawer(guest: GuestWithRSVP) {
    if (!weddingSiteId) return;
    setItineraryDrawerGuest(guest);
    setLoadingDrawer(true);
    try {
      if (isDemoMode) {
        const now = Date.now();
        setGuestAuditEntries([
          { id: `${guest.id}-a1`, action: 'update', changed_at: new Date(now - 1000 * 60 * 90).toISOString(), changed_by: null, old_data: { rsvp_status: 'pending' }, new_data: { rsvp_status: guest.rsvp_status } },
          { id: `${guest.id}-a2`, action: 'update', changed_at: new Date(now - 1000 * 60 * 60 * 26).toISOString(), changed_by: null, old_data: { invited_to_reception: false }, new_data: { invited_to_reception: guest.invited_to_reception } },
        ]);
      }

      const [eventsResult, invitesResult, auditResult] = await Promise.all([
        supabase
          .from('itinerary_events')
          .select('id, event_name, event_date, start_time, location_name')
          .eq('wedding_site_id', weddingSiteId)
          .order('event_date', { ascending: true }),
        supabase
          .from('event_invitations')
          .select('event_id')
          .eq('guest_id', guest.id),
        isDemoMode
          ? Promise.resolve({ data: [], error: null } as any)
          : supabase
              .from('guest_audit_logs')
              .select('id, action, changed_at, changed_by, old_data, new_data')
              .eq('guest_id', guest.id)
              .order('changed_at', { ascending: false })
              .limit(12),
      ]);
      setItineraryEvents((eventsResult.data ?? []) as ItineraryEvent[]);
      setGuestEventIds(new Set((invitesResult.data ?? []).map((r: { event_id: string }) => r.event_id)));
      if (!isDemoMode) {
        setGuestAuditEntries((auditResult.data ?? []) as GuestAuditEntry[]);
      }
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

  const exportCSV = (rowsSource: GuestWithRSVP[] = guests, suffix = 'guests') => {
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Status', 'Plus One', 'Meal Choice', 'RSVP Date', 'Invite Token'];
    const rows = rowsSource.map(guest => [
      guest.first_name || '',
      guest.last_name || '',
      guest.email || '',
      guest.phone || '',
      guest.rsvp_status,
      guest.plus_one_allowed ? 'Yes' : 'No',
      guest.rsvp?.meal_choice || '',
      guest.rsvp_received_at ? new Date(guest.rsvp_received_at).toLocaleDateString() : '',
      guest.invite_token || '',
      formatCustomAnswers(guest.rsvp?.custom_answers || null),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${suffix}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportFilteredCSV = () => {
    const segment = (segmentLabelMap[filterStatus] || filterStatus).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    exportCSV(filteredGuests, `guests-${segment}`);
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

    const eventSelections = parseRsvpEventSelections(guest.rsvp?.notes ?? null);
    const matchesFilter =
      filterStatus === 'all' ||
      guest.rsvp_status === filterStatus ||
      (filterStatus === 'ceremony-no' && eventSelections?.ceremony === false) ||
      (filterStatus === 'reception-no' && eventSelections?.reception === false) ||
      (filterStatus === 'missing-meal' && !!guest.rsvp?.attending && !guest.rsvp?.meal_choice) ||
      (filterStatus === 'plusone-missing' && !!guest.plus_one_allowed && !!guest.rsvp?.attending && !guest.rsvp?.plus_one_name) ||
      (filterStatus === 'pending-no-email' && guest.rsvp_status === 'pending' && !guest.email) ||
      (filterStatus === 'no-contact' && !guest.email && !guest.phone);

    return matchesSearch && matchesFilter;
  });

  const emailableFilteredGuests = filteredGuests.filter(g => !!g.email && !!g.invite_token);


  const daysToWedding = weddingSiteInfo?.wedding_date
    ? Math.ceil((new Date(weddingSiteInfo.wedding_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;


  const issueCountForGuest = (guest: GuestWithRSVP) => {
    let issues = 0;
    const ev = parseRsvpEventSelections(guest.rsvp?.notes ?? null);
    if (guest.rsvp_status === 'pending') issues += 1;
    if (guest.rsvp?.attending && !guest.rsvp?.meal_choice) issues += 1;
    if (guest.plus_one_allowed && guest.rsvp?.attending && !guest.rsvp?.plus_one_name) issues += 1;
    if (guest.rsvp_status === 'pending' && !guest.email && !guest.phone) issues += 1;
    if (ev?.ceremony === false || ev?.reception === false) issues += 1;
    return issues;
  };

  const priorityScore = (guest: GuestWithRSVP) => {
    let score = 0;
    const ev = parseRsvpEventSelections(guest.rsvp?.notes ?? null);
    if (guest.rsvp_status === 'pending') score += 100;
    if (guest.rsvp?.attending && !guest.rsvp?.meal_choice) score += 60;
    if (guest.plus_one_allowed && guest.rsvp?.attending && !guest.rsvp?.plus_one_name) score += 40;
    if (ev?.ceremony === false || ev?.reception === false) score += 15;
    if (guest.rsvp_status === 'pending' && !guest.email) score += 20;
    if (daysToWedding !== null && daysToWedding <= 30) score += 15;
    return score;
  };

  const displayedGuests = sortByPriority
    ? [...filteredGuests].sort((a, b) => priorityScore(b) - priorityScore(a))
    : filteredGuests;


  const nextUnresolvedGuest = displayedGuests.find((g) => issueCountForGuest(g) > 0);

  const selectUnresolvedGuests = () => {
    const ids = displayedGuests.filter((g) => issueCountForGuest(g) > 0).map((g) => g.id);
    setSelectedGuestIds(new Set(ids));
    toast(ids.length > 0 ? `Selected ${ids.length} unresolved guest${ids.length === 1 ? '' : 's'}` : 'No unresolved guests in current view', ids.length > 0 ? 'success' : 'error');
  };

  const clearGuestSelection = () => {
    setSelectedGuestIds(new Set());
  };

  const selectFilteredGuests = () => {
    const ids = filteredGuests.map((g) => g.id);
    setSelectedGuestIds(new Set(ids));
    toast(ids.length > 0 ? `Selected ${ids.length} guest${ids.length === 1 ? '' : 's'} in current filter` : 'No guests in current filter', ids.length > 0 ? 'success' : 'error');
  };

  const keepOnlyVisibleSelection = () => {
    const visibleIds = new Set(filteredGuests.map((g) => g.id));
    setSelectedGuestIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (visibleIds.has(id)) next.add(id);
      });
      return next;
    });
    toast('Selection trimmed to current filter', 'success');
  };

  const stats = {
    total: guests.length,
    confirmed: guests.filter(g => g.rsvp_status === 'confirmed').length,
    declined: guests.filter(g => g.rsvp_status === 'declined').length,
    pending: guests.filter(g => g.rsvp_status === 'pending').length,
    rsvpRate: guests.length > 0 ? Math.round(((guests.filter(g => g.rsvp_status !== 'pending').length) / guests.length) * 100) : 0,
  };


  const contactStats = {
    withEmail: guests.filter(g => !!g.email).length,
    withPhone: guests.filter(g => !!g.phone).length,
    withNoContact: guests.filter(g => !g.email && !g.phone).length,
    contactCoverage: guests.length > 0
      ? Math.round((guests.filter(g => !!g.email || !!g.phone).length / guests.length) * 100)
      : 0,
  };

  const rsvpOps = {
    missingMeal: guests.filter(g => g.rsvp?.attending && !g.rsvp?.meal_choice).length,
    plusOneMissingName: guests.filter(g => g.plus_one_allowed && g.rsvp?.attending && !g.rsvp?.plus_one_name).length,
    ceremonyNo: guests.filter(g => parseRsvpEventSelections(g.rsvp?.notes ?? null)?.ceremony === false).length,
    receptionNo: guests.filter(g => parseRsvpEventSelections(g.rsvp?.notes ?? null)?.reception === false).length,
    noResponse: guests.filter(g => g.rsvp_status === 'pending').length,
    pendingNoEmail: guests.filter(g => g.rsvp_status === 'pending' && !g.email).length,
  };


  const recommendedAction = (() => {
    if (rsvpOps.pendingNoEmail > 0) {
      return {
        filter: 'pending-no-email' as const,
        title: 'Collect missing email addresses',
        detail: `${rsvpOps.pendingNoEmail} pending guests can’t receive reminders yet.`,
      };
    }
    if (rsvpOps.noResponse > 0) {
      return {
        filter: 'pending' as const,
        title: 'Send reminder to pending guests',
        detail: `${rsvpOps.noResponse} guests still haven’t responded.`,
      };
    }
    if (rsvpOps.missingMeal > 0) {
      return {
        filter: 'missing-meal' as const,
        title: 'Collect missing meal choices',
        detail: `${rsvpOps.missingMeal} attending guests are missing meal picks.`,
      };
    }
    if (rsvpOps.plusOneMissingName > 0) {
      return {
        filter: 'plusone-missing' as const,
        title: 'Collect plus-one names',
        detail: `${rsvpOps.plusOneMissingName} RSVPs allow plus-ones but names are missing.`,
      };
    }
    return null;
  })();

  const rsvpCompleteness = Math.max(0, 100 - Math.min(100, (
    (rsvpOps.noResponse * 0.55) +
    (rsvpOps.missingMeal * 0.25) +
    (rsvpOps.plusOneMissingName * 0.2)
  )));


  const campaignReadiness = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (guests.length === 0
          ? 100
          : ((guests.length - contactStats.withNoContact) / guests.length) * 100) * 0.5 +
        (100 - Math.min(100, rsvpOps.pendingNoEmail * 12)) * 0.25 +
        (100 - Math.min(100, rsvpOps.noResponse * 4)) * 0.25
      )
    )
  );


  const opsQueue = guests.flatMap((g) => {
    const items: Array<{ guestId: string; guestName: string; issue: string; filter: typeof filterStatus }> = [];
    const guestName = (g.first_name || g.last_name) ? `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim() : g.name;
    const eventSelections = parseRsvpEventSelections(g.rsvp?.notes ?? null);

    if (g.rsvp_status === 'pending') {
      items.push({ guestId: g.id, guestName, issue: 'No RSVP response yet', filter: 'pending' });
    }
    if (g.rsvp?.attending && !g.rsvp?.meal_choice) {
      items.push({ guestId: g.id, guestName, issue: 'Missing meal choice', filter: 'missing-meal' });
    }
    if (g.plus_one_allowed && g.rsvp?.attending && !g.rsvp?.plus_one_name) {
      items.push({ guestId: g.id, guestName, issue: 'Missing plus-one name', filter: 'plusone-missing' });
    }
    if (eventSelections?.ceremony === false) {
      items.push({ guestId: g.id, guestName, issue: 'Ceremony declined', filter: 'ceremony-no' });
    }
    if (eventSelections?.reception === false) {
      items.push({ guestId: g.id, guestName, issue: 'Reception declined', filter: 'reception-no' });
    }

    return items;
  }).slice(0, 8);


  const segmentLabelMap: Record<string, string> = {
    all: 'All Guests',
    confirmed: 'Confirmed',
    declined: 'Declined',
    pending: 'Pending',
    'ceremony-no': 'Ceremony: No',
    'reception-no': 'Reception: No',
    'missing-meal': 'Missing Meal',
    'plusone-missing': 'Plus-one Missing Name',
    'pending-no-email': 'Pending, No Email',
    'no-contact': 'No Contact Info',
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

  const [skipRecentlyInvited, setSkipRecentlyInvited] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const reminderCandidates = emailableFilteredGuests.filter((g: any) => {
    if (!skipRecentlyInvited) return true;
    const invitedAt = (g as any).invitation_sent_at ? new Date((g as any).invitation_sent_at) : null;
    if (!invitedAt || Number.isNaN(invitedAt.getTime())) return true;
    return (Date.now() - invitedAt.getTime()) > 24 * 60 * 60 * 1000;
  });

  const dryRunRecipientPreview = reminderCandidates.slice(0, 8).map((g) => (g.first_name || g.last_name) ? `${g.first_name ?? ""} ${g.last_name ?? ""}`.trim() : g.name);


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

  if (guestsTab === 'rsvp-config') {
    return (
      <DashboardLayout currentPage="guests">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Guests & RSVP</h1>
            <p className="text-text-secondary">Manage your guest list and track responses</p>
            <div className="mt-4 inline-flex rounded-lg border border-border-subtle bg-surface-subtle p-1">
              <button className="px-3 py-1.5 text-sm rounded-md text-text-secondary" onClick={() => setGuestsTab('ops')}>Guest Ops</button>
              <button className="px-3 py-1.5 text-sm rounded-md bg-white text-text-primary shadow-sm" onClick={() => setGuestsTab('rsvp-config')}>RSVP Config</button>
            </div>
          </div>

          <Card variant="bordered" padding="lg">
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">RSVP Questions & Meal Choices</h3>
                <p className="text-sm text-text-secondary">Configure what attendees answer on the RSVP page.</p>
              </div>

              <div className="space-y-3 p-4 border border-border rounded-xl">
                <label className="flex items-center gap-2 text-sm text-text-primary">
                  <input type="checkbox" checked={rsvpMealEnabled} onChange={(e) => { setRsvpMealEnabled(e.target.checked); setRsvpConfigDirty(true); }} className="w-4 h-4" />
                  Collect meal choice on RSVP form
                </label>
                {rsvpMealEnabled && (
                  <div className="space-y-2">
                    {rsvpMealOptions.map((opt, idx) => (
                      <div key={`meal-${idx}`} className="flex items-center gap-2">
                        <Input value={opt} onChange={(e) => setRsvpMealOptions((prev) => { const n=[...prev]; n[idx]=toTitleCase(e.target.value); return n; })} placeholder={`Meal option ${idx+1}`} />
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setRsvpMealOptions((prev) => prev.filter((_, i) => i !== idx)); setRsvpConfigDirty(true); }}>Remove</Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => { setRsvpMealOptions((prev) => [...prev, '']); setRsvpConfigDirty(true); }}>Add meal option</Button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {rsvpQuestions.map((q, idx) => (
                  <div key={q.id} className="p-4 border border-border rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Question {idx + 1}</p>
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setRsvpQuestions((prev) => prev.filter((x) => x.id !== q.id)); setRsvpConfigDirty(true); }}>Remove</Button>
                    </div>
                    <Input value={q.label} onChange={(e) => { setRsvpQuestions((prev) => prev.map((x) => x.id === q.id ? { ...x, label: e.target.value } : x)); setRsvpConfigDirty(true); }} placeholder="Question prompt" />
                    <div className="grid md:grid-cols-3 gap-3">
                      <Select value={q.type} onChange={(e) => { setRsvpQuestions((prev) => prev.map((x) => x.id === q.id ? { ...x, type: e.target.value as RSVPQuestionSetting['type'], options: (e.target.value === 'single_choice' || e.target.value === 'multi_choice') ? (x.options?.length ? x.options : ['', '']) : [] } : x)); setRsvpConfigDirty(true); }} options={[{ value:'short_text', label:'Short text' },{ value:'long_text', label:'Long text' },{ value:'single_choice', label:'Single choice' },{ value:'multi_choice', label:'Multiple choice' }]} />
                      <Select value={q.appliesTo} onChange={(e) => { setRsvpQuestions((prev) => prev.map((x) => x.id === q.id ? { ...x, appliesTo: e.target.value as RSVPQuestionSetting['appliesTo'] } : x)); setRsvpConfigDirty(true); }} options={[{ value:'all', label:'All attendees' },{ value:'ceremony', label:'Ceremony attendees' },{ value:'reception', label:'Reception attendees' }]} />
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={q.required} onChange={(e) => { setRsvpQuestions((prev) => prev.map((x) => x.id === q.id ? { ...x, required: e.target.checked } : x)); setRsvpConfigDirty(true); }} />Required</label>
                    </div>
                    {(q.type === 'single_choice' || q.type === 'multi_choice') && (
                      <div className="space-y-2">
                        {(q.options ?? []).map((opt, optIdx) => (
                          <div key={`${q.id}-opt-${optIdx}`} className="flex items-center gap-2">
                            <Input value={opt} onChange={(e) => { setRsvpQuestions((prev) => prev.map((x) => { if (x.id !== q.id) return x; const n=[...(x.options ?? [])]; n[optIdx]=toTitleCase(e.target.value); return { ...x, options:n }; })); setRsvpConfigDirty(true); }} placeholder={`Option ${optIdx+1}`} />
                            <Button type="button" variant="ghost" size="sm" onClick={() => { setRsvpQuestions((prev) => prev.map((x) => { if (x.id !== q.id) return x; const n=[...(x.options ?? [])]; n.splice(optIdx,1); return { ...x, options:n }; })); setRsvpConfigDirty(true); }}>Remove</Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => { setRsvpQuestions((prev) => prev.map((x) => x.id === q.id ? { ...x, options: [...(x.options ?? []), ''] } : x)); setRsvpConfigDirty(true); }}>Add choice</Button>
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => { setRsvpQuestions((prev) => [...prev, makeRsvpQuestion()]); setRsvpConfigDirty(true); }}>Add Question</Button>
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="primary" onClick={handleSaveRsvpConfig} disabled={rsvpConfigSaving}>{rsvpConfigSaving ? 'Saving…' : 'Save Now'}</Button>
                    <span className="text-xs text-text-tertiary">{rsvpAutoSaveState === 'saving' ? 'Auto-saving…' : rsvpAutoSaveState === 'saved' ? 'Auto-saved' : rsvpAutoSaveState === 'error' ? 'Auto-save failed' : 'Auto-save on'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
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
          <div className="mt-4 inline-flex rounded-lg border border-border-subtle bg-surface-subtle p-1">
            <button className="px-3 py-1.5 text-sm rounded-md bg-white text-text-primary shadow-sm" onClick={() => setGuestsTab('ops')}>Guest Ops</button>
            <button className="px-3 py-1.5 text-sm rounded-md text-text-secondary" onClick={() => setGuestsTab('rsvp-config')}>RSVP Config</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card variant="bordered" padding="md">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-light rounded-lg flex-shrink-0">
                <Users className="w-6 h-6 text-primary" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
                <p className="text-sm text-text-secondary">Invited</p>
              </div>
            </div>
          </Card>

          <Card variant="bordered" padding="md">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success-light rounded-lg flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-success" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stats.confirmed}</p>
                <p className="text-sm text-text-secondary">RSVP Yes</p>
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
                <p className="text-sm text-text-secondary">RSVP No</p>
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
        </div>

        <Card variant="bordered" padding="md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold text-text-primary">RSVP Ops Panel</h3>
            <span className="text-xs text-text-tertiary break-words">Action-focused follow up</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
            <button onClick={() => { setSearchQuery(''); setFilterStatus('missing-meal'); setViewMode('list'); }} className="text-left p-3 rounded-lg border border-border-subtle hover:border-primary/40 hover:bg-primary/5 transition-colors">
              <p className="text-xs text-text-tertiary break-words">Missing meal choice</p>
              <p className="text-lg font-semibold text-text-primary">{rsvpOps.missingMeal}</p>
            </button>
            <button onClick={() => { setSearchQuery(''); setFilterStatus('plusone-missing'); setViewMode('list'); }} className="text-left p-3 rounded-lg border border-border-subtle hover:border-primary/40 hover:bg-primary/5 transition-colors">
              <p className="text-xs text-text-tertiary break-words">Plus-one missing name</p>
              <p className="text-lg font-semibold text-text-primary">{rsvpOps.plusOneMissingName}</p>
            </button>
            <button onClick={() => { setSearchQuery(''); setFilterStatus('ceremony-no'); }} className="text-left p-3 rounded-lg border border-border-subtle hover:border-primary/40 hover:bg-primary/5 transition-colors">
              <p className="text-xs text-text-tertiary break-words">Ceremony: No</p>
              <p className="text-lg font-semibold text-text-primary">{rsvpOps.ceremonyNo}</p>
            </button>
            <button onClick={() => { setSearchQuery(''); setFilterStatus('reception-no'); }} className="text-left p-3 rounded-lg border border-border-subtle hover:border-primary/40 hover:bg-primary/5 transition-colors">
              <p className="text-xs text-text-tertiary break-words">Reception: No</p>
              <p className="text-lg font-semibold text-text-primary">{rsvpOps.receptionNo}</p>
            </button>
            <button onClick={() => { setSearchQuery(''); setFilterStatus('pending'); }} className="text-left p-3 rounded-lg border border-border-subtle hover:border-primary/40 hover:bg-primary/5 transition-colors">
              <p className="text-xs text-text-tertiary break-words">No response yet</p>
              <p className="text-lg font-semibold text-text-primary">{rsvpOps.noResponse}</p>
            </button>
            <button onClick={() => { setSearchQuery(''); setFilterStatus('pending-no-email'); setViewMode('list'); }} className="text-left p-3 rounded-lg border border-border-subtle hover:border-primary/40 hover:bg-primary/5 transition-colors">
              <p className="text-xs text-text-tertiary break-words">Pending, no email</p>
              <p className="text-lg font-semibold text-text-primary">{rsvpOps.pendingNoEmail}</p>
            </button>
          </div>
        </Card>

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
            <div className="p-4 bg-warning-light border border-warning/20 rounded-xl space-y-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
                  <p className="text-sm font-medium text-warning">{conflicts.length} RSVP {conflicts.length === 1 ? 'issue' : 'issues'} detected</p>
                </div>
                <button
                  onClick={() => { setFilterStatus('pending'); setViewMode('list'); }}
                  className="text-xs px-2 py-1 rounded-md border border-warning/30 text-warning hover:bg-warning/10"
                >
                  Review pending
                </button>
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

            {recommendedAction && (
              <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Recommended next action: {recommendedAction.title}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{recommendedAction.detail}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setFilterStatus(recommendedAction.filter); setViewMode('list'); setSearchQuery(''); }}
                  >
                    Focus now
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addFollowUpTask(`${recommendedAction.title}`)}
                  >
                    Save task
                  </Button>
                </div>
              </div>
            )}

            {opsQueue.length > 0 && (
              <div className="p-3.5 rounded-xl border border-border-subtle bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-text-primary">Priority RSVP queue</p>
                  <span className="text-xs text-text-tertiary break-words">Top {opsQueue.length}</span>
                </div>
                <div className="space-y-1.5">
                  {opsQueue.map((item, idx) => (
                    <button
                      key={`${item.guestId}-${idx}`}
                      onClick={() => { setFilterStatus(item.filter); setViewMode('list'); setSearchQuery(item.guestName); }}
                      className="w-full text-left px-2.5 py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    >
                      <p className="text-xs font-semibold text-text-primary">{item.guestName}</p>
                      <p className="text-[11px] text-text-tertiary">{item.issue}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search guests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap items-start [&>*]:whitespace-nowrap">
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
                <Button variant="outline" size="md" onClick={() => exportCSV()}>
                  <Download className="w-4 h-4 mr-2" />
                  Export All
                </Button>
                <Button variant="outline" size="md" onClick={exportFilteredCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Filtered
                </Button>
                <Button variant="outline" size="md" onClick={handleCopyOpsSummary}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Ops Summary
                </Button>
                <Button variant="outline" size="md" onClick={generateChecklistTasks}>
                  Generate Checklist
                </Button>
                <Button variant="outline" size="md" onClick={() => {
                  const lines = followUpTasks.map((t) => `- [ ] ${t.text}`);
                  const text = lines.length ? lines.join('\n') : '- [ ] No follow-up tasks yet';
                  navigator.clipboard.writeText(text).then(() => toast('Copied checklist markdown', 'success')).catch(() => window.prompt('Copy checklist:', text));
                }}>
                  Copy Checklist
                </Button>
                <Button variant="outline" size="md" onClick={selectUnresolvedGuests}>
                  Select unresolved
                </Button>
                <Button variant="outline" size="md" onClick={selectFilteredGuests}>
                  Select filtered
                </Button>
                <Button variant="outline" size="md" onClick={handleSendSelectedInvitations} disabled={bulkSending || selectedGuestIds.size === 0}>
                  {bulkSending ? 'Sending…' : `Remind Selected (${selectedGuestIds.size})`}
                </Button>
                <Button variant="ghost" size="md" onClick={clearGuestSelection} disabled={selectedGuestIds.size === 0}>
                  Clear Selection
                </Button>
                <Button variant="outline" size="md" onClick={() => { if (nextUnresolvedGuest) { setSearchQuery((nextUnresolvedGuest.first_name || nextUnresolvedGuest.last_name) ? `${nextUnresolvedGuest.first_name ?? ''} ${nextUnresolvedGuest.last_name ?? ''}`.trim() : nextUnresolvedGuest.name); setViewMode('list'); } }} disabled={!nextUnresolvedGuest}>
                  Next unresolved
                </Button>
                <Button variant="primary" size="md" onClick={() => { resetForm(); setShowAddModal(true); }}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Guest
                </Button>
                <Button variant="outline" size="md" onClick={handleSendBulkInvitations} disabled={bulkSending || reminderCandidates.length === 0} title={reminderCandidates.length === 0 ? 'No eligible recipients in this segment' : undefined}>
                  <Mail className="w-4 h-4 mr-2" />
                  {bulkSending ? 'Sending…' : `Remind Filtered (${reminderCandidates.length})`}
                </Button>
                <Button variant="outline" size="md" onClick={handleCopyFilteredEmails} disabled={reminderCandidates.length === 0} title={reminderCandidates.length === 0 ? 'No eligible recipients in this segment' : undefined}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Emails
                </Button>
                <Button variant="outline" size="md" onClick={() => window.alert(`Campaign dry run (${segmentLabelMap[filterStatus] || filterStatus})\nRecipients: ${reminderCandidates.length}\n\n${dryRunRecipientPreview.join('\n')}${reminderCandidates.length > dryRunRecipientPreview.length ? `\n+${reminderCandidates.length - dryRunRecipientPreview.length} more` : ''}`)} disabled={reminderCandidates.length === 0}>
                  Dry Run
                </Button>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-border-subtle bg-surface-subtle space-y-2">
              <div className="text-xs text-text-secondary">Top blockers: <span className="font-medium text-text-primary">No response ({rsvpOps.noResponse})</span> · <span className="font-medium text-text-primary">Missing meal ({rsvpOps.missingMeal})</span> · <span className="font-medium text-text-primary">Plus-one name ({rsvpOps.plusOneMissingName})</span> · <span className="font-medium text-text-primary">Pending w/o email ({rsvpOps.pendingNoEmail})</span> · <span className="font-medium text-text-primary">No contact ({contactStats.withNoContact})</span></div>
              {daysToWedding !== null && (
                <div className={`text-xs rounded-md px-2 py-1 inline-flex items-center gap-1 ${daysToWedding <= 30 ? 'bg-warning/10 text-warning border border-warning/30' : 'bg-primary/5 text-primary border border-primary/20'}`}>
                  Wedding in {daysToWedding} day{daysToWedding === 1 ? '' : 's'}
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-xs text-text-secondary">
                  Segment: <span className="font-semibold text-text-primary">{segmentLabelMap[filterStatus] || filterStatus}</span> ·
                  Eligible reminders: <span className="font-semibold text-text-primary">{reminderCandidates.length}</span> ·
                  Campaign readiness: <span className="font-semibold text-text-primary">{campaignReadiness}%</span>
                </p>
                <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
                  <input type="checkbox" checked={skipRecentlyInvited} onChange={(e) => setSkipRecentlyInvited(e.target.checked)} />
                  Skip guests invited in last 24h
                </label>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-xs text-text-secondary w-28">Campaign preset</label>
                <select
                  value={campaignPreset}
                  onChange={(e) => applyCampaignPreset(e.target.value as any)}
                  className="text-xs border border-border rounded-md px-2 py-1.5 bg-white text-text-primary"
                >
                  <option value="pending">Pending responses ({rsvpOps.noResponse})</option>
                  <option value="missing-meal">Missing meal ({rsvpOps.missingMeal})</option>
                  <option value="plusone-missing">Missing plus-one name ({rsvpOps.plusOneMissingName})</option>
                  <option value="ceremony-no">Ceremony: No ({rsvpOps.ceremonyNo})</option>
                  <option value="reception-no">Reception: No ({rsvpOps.receptionNo})</option>
                  <option value="pending-no-email">Pending, no email ({rsvpOps.pendingNoEmail})</option>
                </select>
              </div>

              {reminderCandidates.length > 0 && (
                <div className="space-y-1">
                  <button
                    onClick={() => setShowRecipientPreview(v => !v)}
                    className="text-xs text-primary hover:underline"
                  >
                    {showRecipientPreview ? 'Hide' : 'Show'} recipient preview ({reminderCandidates.length})
                  </button>
                  {showRecipientPreview && (
                    <div className="max-h-28 overflow-auto rounded-lg border border-border bg-white p-2 text-xs text-text-secondary">
                      {reminderCandidates.slice(0, 20).map((g) => (
                        <div key={g.id} className="py-0.5">
                          {(g.first_name || g.last_name) ? `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim() : g.name}
                          {g.email ? ` · ${g.email}` : ''}
                        </div>
                      ))}
                      {reminderCandidates.length > 20 && (
                        <div className="pt-1 text-text-tertiary">+{reminderCandidates.length - 20} more</div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { setFilterStatus('pending'); setViewMode('list'); }} className="text-[11px] px-2 py-1 rounded-full border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Focus pending</button>
                <button onClick={() => { setFilterStatus('missing-meal'); setViewMode('list'); }} className="text-[11px] px-2 py-1 rounded-full border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Focus missing meal</button>
                <button onClick={() => { setFilterStatus('plusone-missing'); setViewMode('list'); }} className="text-[11px] px-2 py-1 rounded-full border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Focus plus-one names</button>
                <button onClick={() => { setFilterStatus('pending-no-email'); setViewMode('list'); }} className="text-[11px] px-2 py-1 rounded-full border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Focus pending no-email</button>
                <button onClick={() => { setFilterStatus('all'); setViewMode('list'); setSearchQuery(''); setSortByPriority(true); }} className="text-[11px] px-2 py-1 rounded-full border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Focus high-risk first</button>
                <button onClick={() => { setSearchQuery(''); setFilterStatus('no-contact'); setViewMode('list'); }} className="text-[11px] px-2 py-1 rounded-full border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Review no-contact ({contactStats.withNoContact})</button>
              </div>

              {savedSegments.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-text-tertiary">Saved segments</p>
                    <button
                      onClick={() => setSavedSegments([])}
                      className="text-[11px] text-text-tertiary hover:text-text-primary underline"
                    >
                      Clear segments
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {savedSegments.map((seg) => (
                      <button key={seg.id} onClick={() => { setFilterStatus(seg.filter as any); setViewMode('list'); setSearchQuery(''); }} className="text-[11px] px-2 py-1 rounded-full border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">
                        {seg.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {followUpTasks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-text-tertiary">Saved follow-up tasks</p>
                    <button
                      onClick={() => setFollowUpTasks([])}
                      className="text-[11px] text-text-tertiary hover:text-text-primary underline"
                    >
                      Clear tasks
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {followUpTasks.map((task) => (
                      <span key={task.id} className="text-[11px] px-2 py-1 rounded-full border border-border bg-white text-text-secondary">{task.text} · {task.createdAt}</span>
                    ))}
                  </div>
                </div>
              )}

              {campaignLog.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-text-tertiary">Recent reminder sends</p>
                    <button
                      onClick={() => setCampaignLog([])}
                      className="text-[11px] text-text-tertiary hover:text-text-primary underline"
                    >
                      Clear log
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {campaignLog.map((log) => (
                      <span key={log.id} className="text-[11px] px-2 py-1 rounded-full border border-border bg-white text-text-secondary">
                        {log.segment}: {log.count} sent · {log.sentAt}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border-subtle bg-surface-subtle">
              <p className="text-xs text-text-secondary">
                Active segment: <span className="font-semibold text-text-primary">{segmentLabelMap[filterStatus] || filterStatus}</span>
                {searchQuery ? <> · Search: <span className="font-semibold text-text-primary">“{searchQuery}”</span></> : null}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={saveCurrentSegment}
                  className="text-xs px-2 py-1 rounded-md border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary"
                >
                  Save segment
                </button>
                <button
                  onClick={() => { setFilterStatus('all'); setSearchQuery(''); setViewMode('list'); }}
                  className="text-xs px-2 py-1 rounded-md border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary"
                >
                  Clear filters
                </button>
              </div>
            </div>

            {filterStatus === 'no-contact' && (
              <div className="p-2.5 rounded-lg border border-warning/30 bg-warning/10 text-warning text-xs">
                These guests have no email or phone. Add contact info before reminder campaigns.
              </div>
            )}

            <div className="sticky top-2 z-10 flex gap-2 flex-wrap items-start justify-between bg-white/90 backdrop-blur p-2 rounded-lg border border-border-subtle overflow-hidden">
              <div className="flex gap-2 flex-wrap min-w-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSortByPriority(v => !v)}
                    className="text-xs px-2 py-1 rounded-md border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary"
                  >
                    {sortByPriority ? 'Priority sort: On' : 'Priority sort: Off'}
                  </button>
                  {sortByPriority && <span className="text-[11px] text-text-tertiary">Ranks by pending/meal/plus-one/contact gaps</span>}
                  <span className="text-[11px] text-text-tertiary">Issue legend: pending, meal, plus-one, contact, event-decline</span>
                </div>
                {([
                  { id: 'all', label: `All (${stats.total})` },
                  { id: 'confirmed', label: `Confirmed (${stats.confirmed})` },
                  { id: 'declined', label: `Declined (${stats.declined})` },
                  { id: 'pending', label: `Pending (${stats.pending})` },
                  { id: 'ceremony-no', label: `Ceremony No (${rsvpOps.ceremonyNo})` },
                  { id: 'reception-no', label: `Reception No (${rsvpOps.receptionNo})` },
                  { id: 'missing-meal', label: `Missing Meal (${rsvpOps.missingMeal})` },
                  { id: 'plusone-missing', label: `Plus-One Missing (${rsvpOps.plusOneMissingName})` },
                  { id: 'pending-no-email', label: `Pending No Email (${rsvpOps.pendingNoEmail})` },
                  { id: 'no-contact', label: `No Contact (${contactStats.withNoContact})` },
                ] as const).map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => { setFilterStatus(id); setViewMode('list'); }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
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
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border whitespace-nowrap shrink-0 ${
                  viewMode === 'households'
                    ? 'bg-primary text-text-inverse border-primary'
                    : 'text-text-secondary border-border hover:border-primary hover:text-primary'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                Households
              </button>
            </div>


            {selectedGuestIds.size > 0 && viewMode === 'list' && (
              <div className="mb-3 flex items-center justify-between px-4 py-2 bg-primary/8 border border-primary/20 rounded-xl">
                <span className="text-sm font-medium text-primary">{selectedGuestIds.size} selected · {filteredGuests.filter((g) => selectedGuestIds.has(g.id)).length} visible</span>
                <div className="flex items-center gap-2">
                  <button onClick={keepOnlyVisibleSelection} className="text-xs px-2 py-1 rounded-md border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Keep visible only</button>
                  <button onClick={clearGuestSelection} className="text-xs px-2 py-1 rounded-md border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Clear</button>
                </div>
              </div>
            )}

            {filteredGuests.length === 0 && viewMode === 'list' ? (
              <div className="p-6 border border-dashed border-border rounded-xl text-center bg-surface-subtle">
                <p className="text-sm text-text-secondary">No guests in this segment right now.</p>
                <button
                  onClick={() => { setFilterStatus('all'); setSearchQuery(''); }}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  Clear filters to view all guests
                </button>
              </div>
            ) : viewMode === 'households' ? (
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
                          <span className="text-xs text-text-tertiary break-words">({members.length} guests)</span>
                        </div>
                      </div>
                      <div className="divide-y divide-border-subtle">
                        {members.map(guest => {
                          const name = guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.name;
                          return (
                            <div key={guest.id} className="flex items-center justify-between px-5 py-3">
                              <div>
                                <p className="text-sm font-medium text-text-primary">{name}</p>
                                <p className="text-xs text-text-tertiary break-words">{guest.email || 'No email'}</p>
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
                        <span className="text-xs text-text-tertiary break-words">({households.ungrouped.length})</span>
                      </div>
                      <p className="text-xs text-text-tertiary break-words">Select guests to merge into households</p>
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
                              <p className="text-xs text-text-tertiary break-words">{guest.email || 'No email'}</p>
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
                                <span className="text-xs text-text-tertiary break-words">
                                  {new Date(guest.rsvp_received_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                              {(() => {
                                const issues = issueCountForGuest(guest);
                                if (issues <= 0) return null;
                                return (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${issues >= 3 ? 'bg-warning/10 text-warning border-warning/30' : 'bg-primary/5 text-primary border-primary/20'}`}>
                                    {issues >= 3 ? 'High risk' : 'Needs review'} · {issues}
                                  </span>
                                );
                              })()}
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
                              {(() => {
                                const custom = formatCustomAnswers(guest.rsvp?.custom_answers || null);
                                if (!custom) return null;
                                return (
                                  <p className="text-[11px] text-text-tertiary pt-1 truncate" title={custom}>
                                    Custom answers saved
                                  </p>
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
            onClick={() => { setItineraryDrawerGuest(null); setGuestAuditEntries([]); }}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-surface shadow-2xl z-50 flex flex-col border-l border-border">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-base font-semibold text-text-primary">
                  {itineraryDrawerGuest.first_name && itineraryDrawerGuest.last_name
                    ? `${itineraryDrawerGuest.first_name} ${itineraryDrawerGuest.last_name}`
                    : itineraryDrawerGuest.name}
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">Guest activity and itinerary invitations</p>
                <button
                  onClick={() => copyContactRequestLink(itineraryDrawerGuest)}
                  className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-border hover:border-primary hover:text-primary transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy contact update link
                </button>
              </div>
              <button
                onClick={() => { setItineraryDrawerGuest(null); setGuestAuditEntries([]); }}
                className="p-2 rounded-lg hover:bg-surface-subtle text-text-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {(() => {
                const entries = getCustomAnswerEntries(itineraryDrawerGuest.rsvp?.custom_answers || null);
                const status = itineraryDrawerGuest.rsvp_status;
                const meal = itineraryDrawerGuest.rsvp?.meal_choice;
                const plusOne = itineraryDrawerGuest.rsvp?.plus_one_name;

                return (
                  <div className="mb-4 p-4 bg-surface-subtle border border-border rounded-xl space-y-2">
                    <p className="text-xs uppercase tracking-wide text-text-tertiary">RSVP details</p>
                    <div className="text-sm text-text-primary">
                      <span className="font-medium">Status:</span>{' '}
                      <span className="capitalize">{status}</span>
                    </div>
                    {meal && (
                      <div className="text-sm text-text-primary">
                        <span className="font-medium">Meal:</span> <span className="capitalize">{meal}</span>
                      </div>
                    )}
                    {plusOne && (
                      <div className="text-sm text-text-primary">
                        <span className="font-medium">Plus one:</span> {plusOne}
                      </div>
                    )}
                    {entries.length > 0 && (
                      <div className="pt-1 space-y-1.5">
                        <p className="text-xs uppercase tracking-wide text-text-tertiary">Custom answers</p>
                        {entries.map((entry) => (
                          <div key={entry.key} className="text-sm text-text-primary flex items-start justify-between gap-3">
                            <span className="text-text-secondary truncate">{entry.key}</span>
                            <span className="text-right">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="mb-4 p-4 bg-surface-subtle border border-border rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase tracking-wide text-text-tertiary">Guest activity</p>
                  <span className="text-[11px] text-text-tertiary">Last {guestAuditEntries.length} changes</span>
                </div>
                {guestAuditEntries.length === 0 ? (
                  <p className="text-xs text-text-tertiary">No recent changes yet. Updates to this guest will appear here automatically.</p>
                ) : (
                  <div className="space-y-2.5">
                    {guestAuditEntries.map((entry) => {
                      const absolute = new Date(entry.changed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                      const relative = formatRelativeTime(entry.changed_at);
                      const Icon = getAuditActionIcon(entry.action);
                      return (
                        <div key={entry.id} className="text-xs text-text-primary border border-border-subtle rounded-lg p-2.5 bg-surface">
                          <div className="flex items-start justify-between gap-3">
                            <span className={`capitalize px-2 py-0.5 rounded border inline-flex items-center gap-1.5 ${getAuditActionTone(entry.action)}`}>
                              <Icon className="w-3 h-3" />
                              {entry.action}
                            </span>
                            <div className="text-right leading-tight">
                              <span className="text-text-secondary whitespace-nowrap">{relative}</span>
                              <p className="text-[10px] text-text-tertiary mt-0.5">{absolute}</p>
                            </div>
                          </div>
                          <p className="mt-1.5 text-text-secondary leading-relaxed">{summarizeAuditEntry(entry)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {loadingDrawer ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : itineraryEvents.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
                  <p className="text-sm font-medium text-text-secondary mb-1">No events on the itinerary</p>
                  <p className="text-xs text-text-tertiary break-words">Add events on the Itinerary page first.</p>
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
