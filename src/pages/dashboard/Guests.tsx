import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { PLANNER_ROLE_OPTIONS, canEditPlannerSurface, derivePlannerRoleFromPermissions, readPlannerAccessRole, writePlannerAccessRole, type PlannerAccessRole } from '../../lib/plannerAccess';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { formatGuestOpsDate, formatGuestOpsDateTime, formatGuestOpsRelativeTime, getGuestOpsTimestamp } from './guestOpsTime';
import { formatGuestEventDate } from './guestEventDate';
import { getDaysUntilGuestWedding } from './guestWeddingDate';
import { getRsvpFallbackState } from '../../lib/rsvpFallbackState';
import { getInviteLifecycleState } from '../../lib/inviteLifecycle';
import { getGuestLifecycleStage } from '../../lib/guestLifecycleStage';
import { getPlusOneState } from '../../lib/plusOneState';
import { getPerEventRsvpState } from '../../lib/perEventRsvpState';
import { getRsvpExceptionStates } from '../../lib/rsvpExceptionState';
import { hasRespondedRsvpStatus, isAttendingRsvpStatus, isDeclinedRsvpStatus, isPendingRsvpStatus } from '../../lib/rsvpStatus';
import { extractDietaryNote } from '../../lib/dietaryNotes';
import { deriveInviteEvents } from '../../lib/rsvpEventFallback';
import { deleteEventRsvpByInvitationId, deleteEventRsvpsByInvitationIds, getEventRsvpSnapshotsByInvitationIds, restoreEventRsvpSnapshots, type EventRsvpSnapshot } from '../../lib/eventRsvpCleanup';
import { findCsvHeaderIndex, normalizeCsvHeader } from '../../lib/csvHeaderMatcher';
import { DashboardStateBlock } from '../../components/dashboard/DashboardStateBlock';
import { PlannerHandoffCard } from '../../components/dashboard/PlannerHandoffCard';
import { Card, Button, Badge, Input, Select, Textarea } from '../../components/ui';
import { Download, UserPlus, CheckCircle2, XCircle, Clock, X, Upload, Users, Mail, AlertCircle, Merge, Scissors, Home, CalendarDays, ChevronRight, Loader2, Copy, ChevronDown, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import { demoWeddingSite, demoGuests, demoRSVPs } from '../../lib/demoData';
import { buildQuickStartPhotosPath, readQuickStartDashboardContinuation } from '../../lib/quickStartContinuation';
import { sendWeddingInvitation } from '../../lib/emailService';
import { resolvePublicSiteSlugFromRow } from '../../lib/publicSiteSlug';
import { buildGuestOpsCoach, buildGuestOutreachSequence } from '../../lib/guestOpsCoach';
import { getPlannerHandoffCopy } from '../../lib/plannerHandoffState';
import { buildGuestContactUpdateUrl, buildRsvpInviteUrl } from '../../lib/publicGuestLinks';
import { buildGuestContactLinkListPayload, buildNoContactChecklistPayload } from './guestContactLinkList';
import { getSmsRsvpLinkCandidates } from './guestReminderCandidates';
import * as XLSX from 'xlsx';

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
  checked_in_at?: string | null;
  checkin_notes?: string | null;
  thank_you_sent_at?: string | null;
  thank_you_notes?: string | null;
  household_id: string | null;
}

interface RSVP {
  attending: boolean;
  attending_ceremony?: boolean | null;
  attending_reception?: boolean | null;
  meal_choice: string | null;
  plus_one_name: string | null;
  plus_one_count?: number | null;
  children_count?: number | null;
  notes: string | null;
  custom_answers?: Record<string, string | string[]> | null;
}

interface GuestWithRSVP extends Guest {
  rsvp?: RSVP;
  notes?: string | null;
  invited_event_ids?: string[] | null;
}

interface GuestAuditEntry {
  id: string;
  guest_id?: string;
  action: 'insert' | 'update' | 'delete';
  changed_at: string;
  changed_by: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

interface RsvpConflict {
  id: string;
  guest_id: string;
  conflict_code: string;
  message: string;
  severity: 'error' | 'warning' | string;
  created_at: string;
  resolved: boolean;
  resolved_at?: string | null;
}

interface CsvFieldMap {
  first_name: number;
  last_name: number;
  full_name: number;
  email: number;
  phone: number;
  plus_one: number;
  status: number;
  meal_choice: number;
  rsvp_date: number;
  invite_token: number;
  household_id: number;
  household_name: number;
  invited_events: number[];
}

interface RsvpConflictStats {
  openNow: number;
  opened24h: number;
  resolved24h: number;
  unresolvedOver24h: number;
  unresolvedOver72h: number;
  topCodes: Array<{ code: string; count: number }>;
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

function getAuditGuestLabel(entry: GuestAuditEntry): string {
  const preferred = (entry.new_data?.name as string | undefined)
    || `${entry.new_data?.first_name ?? ''} ${entry.new_data?.last_name ?? ''}`.trim()
    || (entry.old_data?.name as string | undefined)
    || `${entry.old_data?.first_name ?? ''} ${entry.old_data?.last_name ?? ''}`.trim();
  return preferred || 'Guest';
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { fromQuickStart, nextStep } = readQuickStartDashboardContinuation(searchParams);
  const { user, isDemoMode } = useAuth();
  const { toast } = useToast();
  const [guests, setGuests] = useState<GuestWithRSVP[]>([]);
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);
  const [weddingSiteInfo, setWeddingSiteInfo] = useState<WeddingSiteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'declined' | 'pending' | 'checked-in' | 'thank-you-due' | 'due-reminder' | 'missing-address' | 'ceremony-no' | 'reception-no' | 'missing-meal' | 'plusone-missing' | 'pending-no-email' | 'manual-follow-up' | 'manual-handled' | 'no-contact'>('all');
  const [extraFilters, setExtraFilters] = useState<string[]>([]);
  const [extraFilterDraft, setExtraFilterDraft] = useState<string>('');
  const [itineraryFilterEvents, setItineraryFilterEvents] = useState<ItineraryEvent[]>([]);
  const [eventInviteGuestMap, setEventInviteGuestMap] = useState<Map<string, Set<string>>>(new Map());

  const effectiveItineraryEvents = useMemo<ItineraryEvent[]>(() => {
    if (itineraryFilterEvents.length > 0) return itineraryFilterEvents;
    return [
      { id: 'legacy-ceremony', event_name: 'Ceremony', event_date: '', start_time: '', location_name: '' },
      { id: 'legacy-reception', event_name: 'Reception', event_date: '', start_time: '', location_name: '' },
    ];
  }, [itineraryFilterEvents]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<GuestWithRSVP | null>(null);
  const [sendingInviteId, setSendingInviteId] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [campaignLog, setCampaignLog] = useState<Array<{ id: number; segment: string; count: number; sentAt: string }>>([]);
  const [showRecipientPreview, setShowRecipientPreview] = useState(false);
  const [campaignPreset, setCampaignPreset] = useState<'pending' | 'missing-meal' | 'plusone-missing' | 'ceremony-no' | 'reception-no' | 'pending-no-email'>('pending');
  const [followUpTasks, setFollowUpTasks] = useState<Array<{ id: number; text: string; createdAt: string }>>([]);
  const [sortByPriority, setSortByPriority] = useState(false);
  const [savedSegments, setSavedSegments] = useState<Array<{ id: number; label: string; filter: string; createdAt: string }>>([]);
  const [guestsTab, setGuestsTab] = useState<'ops' | 'rsvp-config'>('ops');
  const [guestsRole, setGuestsRole] = useState<PlannerAccessRole>('owner');
  const [rsvpQuestions, setRsvpQuestions] = useState<RSVPQuestionSetting[]>([]);
  const [rsvpMealEnabled, setRsvpMealEnabled] = useState(true);
  const [rsvpMealOptions, setRsvpMealOptions] = useState<string[]>(['Chicken','Beef','Fish','Vegetarian','Vegan']);
  const [rsvpConfigSaving, setRsvpConfigSaving] = useState(false);
  const [rsvpAutoSaveState, setRsvpAutoSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [rsvpConfigDirty, setRsvpConfigDirty] = useState(false);
  const [rsvpConflicts, setRsvpConflicts] = useState<RsvpConflict[]>([]);
  const [rsvpConflictHistory, setRsvpConflictHistory] = useState<RsvpConflict[]>([]);
  const [conflictFilter, setConflictFilter] = useState<'all' | 'error' | 'warning'>('all');
  const isGuestsReadOnly = !canEditPlannerSurface(guestsRole);
  const [showConflictDetails, setShowConflictDetails] = useState(false);
  const [resolvingConflictId, setResolvingConflictId] = useState<string | null>(null);
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

    try {
      const rawRole = readPlannerAccessRole('guests', weddingSiteId ?? 'global');
      if (rawRole) setGuestsRole(rawRole);
    } catch {
      // noop
    }
  }, [weddingSiteId]);

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
      writePlannerAccessRole('guests', weddingSiteId ?? 'global', guestsRole);
    } catch {
      // noop
    }
  }, [guestsRole, weddingSiteId]);


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

  const [viewMode, setViewMode] = useState<'list' | 'households'>('households');
  const [checkInMode, setCheckInMode] = useState(false);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [householdBusy, setHouseholdBusy] = useState(false);

  const [csvPreview, setCsvPreview] = useState<Record<string, unknown>[] | null>(null);
  const [csvSkipped, setCsvSkipped] = useState<string[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvUnknownEvents, setCsvUnknownEvents] = useState<string[]>([]);
  const [csvDuplicateNames, setCsvDuplicateNames] = useState<string[]>([]);
  const [csvHouseholdWarnings, setCsvHouseholdWarnings] = useState<string[]>([]);
  const [csvSelectedFilename, setCsvSelectedFilename] = useState<string | null>(null);
  const [csvMappingSummary, setCsvMappingSummary] = useState<{ core: string[]; rsvp: string[]; household: string[]; eventCols: string[]; weak: string[] }>({ core: [], rsvp: [], household: [], eventCols: [], weak: [] });
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvDataRows, setCsvDataRows] = useState<string[][]>([]);
  const [csvColumnSamples, setCsvColumnSamples] = useState<string[]>([]);
  const [csvFieldMap, setCsvFieldMap] = useState<CsvFieldMap | null>(null);
  const [csvShowMapper, setCsvShowMapper] = useState(false);
  const [csvImportSummary, setCsvImportSummary] = useState<{ imported: number; skipped: number; unknownEvents: number; duplicateNames: number; guardedHouseholds: number; householdKeys: number } | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const cleanGuestsView = !showInsights;
  const csvNameMappingValid = !!csvFieldMap && csvFieldMap.first_name >= 0 && csvFieldMap.last_name >= 0;
  const csvColumnLetter = (index: number) => {
    let n = index + 1;
    let out = '';
    while (n > 0) {
      const rem = (n - 1) % 26;
      out = String.fromCharCode(65 + rem) + out;
      n = Math.floor((n - 1) / 26);
    }
    return out;
  };

  const [itineraryDrawerGuest, setItineraryDrawerGuest] = useState<GuestWithRSVP | null>(null);
  const [itineraryEvents, setItineraryEvents] = useState<ItineraryEvent[]>([]);
  const [guestEventIds, setGuestEventIds] = useState<Set<string>>(new Set());
  const [loadingDrawer, setLoadingDrawer] = useState(false);
  const [togglingEventId, setTogglingEventId] = useState<string | null>(null);
  const [guestAuditEntries, setGuestAuditEntries] = useState<GuestAuditEntry[]>([]);
  const [rsvpAuditFeed, setRsvpAuditFeed] = useState<GuestAuditEntry[]>([]);
  const [rsvpAuditLoading, setRsvpAuditLoading] = useState(false);
  const [assistedRsvpGuest, setAssistedRsvpGuest] = useState<GuestWithRSVP | null>(null);
  const [assistedRsvpStatus, setAssistedRsvpStatus] = useState<'confirmed' | 'declined'>('confirmed');
  const [assistedRsvpSource, setAssistedRsvpSource] = useState<'phone' | 'text' | 'family' | 'in-person'>('phone');
  const [assistedRsvpNotes, setAssistedRsvpNotes] = useState('');
  const [assistedRsvpSaving, setAssistedRsvpSaving] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    plus_one_allowed: false,
    require_plus_one_name: false,
    invited_to_ceremony: true,
    invited_to_reception: true,
  });
  const [formEventInviteIds, setFormEventInviteIds] = useState<Set<string>>(new Set());

  const fetchWeddingSite = useCallback(async () => {
    if (!user) {
      setWeddingSiteId(null);
      setWeddingSiteInfo(null);
      setGuests([]);
      return;
    }

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

    try {
      const activeSite = await resolveActiveSiteForUser(user.id);
      const activeSiteId = activeSite?.id ?? null;
      setGuestsRole(activeSite?.role ?? 'owner');
      const { data, error } = activeSiteId ? await supabase
        .from('wedding_sites')
        .select('id, couple_name_1, couple_name_2, wedding_date, venue_name, venue_address, site_url, rsvp_custom_questions, rsvp_meal_config')
        .eq('id', activeSiteId)
        .maybeSingle() : { data: null, error: null };

      if (error) throw error;

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
        const cadence = Number((data as { reminder_cadence_days?: unknown }).reminder_cadence_days);
        if ([1, 3, 7].includes(cadence)) setReminderCadenceDays(cadence as 1 | 3 | 7);
        setAutoRemindersEnabled(Boolean((data as { auto_reminders_enabled?: unknown }).auto_reminders_enabled));
        rsvpConfigLoadedRef.current = true;
      } else {
        setWeddingSiteId(null);
        setWeddingSiteInfo(null);
        setGuests([]);
      }
    } catch {
      setWeddingSiteId(null);
      setWeddingSiteInfo(null);
      setGuests([]);
      toast('Couldn’t load guest site settings right now. Please try again.', 'error');
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
          rsvp_received_at: hasRespondedRsvpStatus(guest.rsvp_status) ? new Date().toISOString() : null,
          rsvp: demoRSVPs.find(r => r.guest_id === guest.id),
        }));
        setGuests(guestsWithRsvps as unknown as GuestWithRSVP[]);
        setRsvpConflicts([]);
        setRsvpConflictHistory([]);
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
        const windowStartIso = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString();
        const [{ data: rsvpsData, error: rsvpsError }, { data: conflictsData, error: conflictsError }, { data: conflictHistoryData, error: conflictHistoryError }] = await Promise.all([
          supabase.from('rsvps').select('*').in('guest_id', guestIds),
          supabase
            .from('rsvp_conflicts')
            .select('id, guest_id, conflict_code, message, severity, created_at, resolved, resolved_at')
            .eq('wedding_site_id', weddingSiteId)
            .eq('resolved', false)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('rsvp_conflicts')
            .select('id, guest_id, conflict_code, message, severity, created_at, resolved, resolved_at')
            .eq('wedding_site_id', weddingSiteId)
            .gte('created_at', windowStartIso)
            .order('created_at', { ascending: false })
            .limit(500),
        ]);

        if (rsvpsError) throw rsvpsError;
        if (conflictsError) throw conflictsError;
        if (conflictHistoryError) throw conflictHistoryError;

        const guestsWithRsvps = guestsData.map(guest => ({
          ...guest,
          rsvp: rsvpsData?.find(r => r.guest_id === guest.id),
        }));

        setGuests(guestsWithRsvps as unknown as GuestWithRSVP[]);
        setRsvpConflicts((conflictsData ?? []) as RsvpConflict[]);
        setRsvpConflictHistory((conflictHistoryData ?? []) as RsvpConflict[]);
      }
    } catch {
      setGuests([]);
      setRsvpConflicts([]);
      setRsvpConflictHistory([]);
      toast('Couldn’t load guest records right now. Please try again.', 'error');
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

  useEffect(() => {
    let cancelled = false;

    async function loadItineraryFilterData() {
      if (!weddingSiteId || isDemoMode) {
        if (!cancelled) {
          setItineraryFilterEvents([]);
          setEventInviteGuestMap(new Map());
        }
        return;
      }

      try {
        const [eventsRes, siteRes] = await Promise.all([
          supabase
            .from('itinerary_events')
            .select('id, event_name, event_date, start_time, location_name')
            .eq('wedding_site_id', weddingSiteId)
            .order('event_date', { ascending: true }),
          supabase
            .from('wedding_sites')
            .select('wedding_data')
            .eq('id', weddingSiteId)
            .maybeSingle(),
        ]);

        if (eventsRes.error) throw eventsRes.error;
        if (siteRes.error) throw siteRes.error;

        if (cancelled) return;

        const seededEvents = (((siteRes.data?.wedding_data as { meta?: { rsvpEventSeeds?: Array<{ id: string; label: string; dateLabel?: string; locationName?: string | null }> } } | null)?.meta?.rsvpEventSeeds) ?? []);
        const siteEvents = (eventsRes.data ?? []) as ItineraryEvent[];
        const eventIds = siteEvents.map((event) => event.id);

        const invitesRes = eventIds.length > 0
          ? await supabase
              .from('event_invitations')
              .select('event_id, guest_id')
              .in('event_id', eventIds)
          : { data: [], error: null };

        if (invitesRes.error) throw invitesRes.error;

        setItineraryFilterEvents(deriveInviteEvents(siteEvents, seededEvents) as ItineraryEvent[]);

        const next = new Map<string, Set<string>>();
        ((invitesRes.data ?? []) as Array<{ event_id: string; guest_id: string }>).forEach((row) => {
          const set = next.get(row.event_id) ?? new Set<string>();
          set.add(row.guest_id);
          next.set(row.event_id, set);
        });
        setEventInviteGuestMap(next);
      } catch {
        if (!cancelled) {
          toast('Couldn’t load itinerary filters right now. Please try again.', 'error');
          setItineraryFilterEvents([]);
          setEventInviteGuestMap(new Map());
        }
      }
    }

    void loadItineraryFilterData();
    return () => {
      cancelled = true;
    };
  }, [weddingSiteId, isDemoMode]);

  useEffect(() => {
    let cancelled = false;

    async function loadRsvpAuditFeed() {
      if (guestsTab !== 'rsvp-config') return;

      setRsvpAuditLoading(true);
      try {
        if (isDemoMode) {
          const now = Date.now();
          const demoEntries: GuestAuditEntry[] = guests.slice(0, 4).map((g, idx) => ({
            id: `demo-rsvp-audit-${g.id}-${idx}`,
            guest_id: g.id,
            action: idx % 3 === 0 ? 'insert' : 'update',
            changed_at: new Date(now - (idx + 1) * 1000 * 60 * 35).toISOString(),
            changed_by: null,
            old_data: { rsvp_status: 'pending', name: g.name },
            new_data: { rsvp_status: g.rsvp_status, name: g.name },
          }));
          if (!cancelled) setRsvpAuditFeed(demoEntries);
          return;
        }

        if (!weddingSiteId) {
          if (!cancelled) setRsvpAuditFeed([]);
          return;
        }

        const { data, error } = await supabase
          .from('guest_audit_logs')
          .select('id, guest_id, action, changed_at, changed_by, old_data, new_data')
          .eq('wedding_site_id', weddingSiteId)
          .order('changed_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        if (!cancelled) setRsvpAuditFeed((data ?? []) as GuestAuditEntry[]);
      } catch {
        if (!cancelled) {
          setRsvpAuditFeed([]);
          toast('Couldn’t load RSVP audit history right now. Please try again.', 'error');
        }
      } finally {
        if (!cancelled) setRsvpAuditLoading(false);
      }
    }

    void loadRsvpAuditFeed();
    return () => {
      cancelled = true;
    };
  }, [guestsTab, isDemoMode, guests, weddingSiteId]);

  const visibleRsvpConflicts = useMemo(
    () => rsvpConflicts.filter((c) => conflictFilter === 'all' ? true : c.severity === conflictFilter),
    [rsvpConflicts, conflictFilter]
  );

  const rsvpConflictStats = useMemo<RsvpConflictStats>(() => {
    const now = Date.now();
    const dayAgo = now - (24 * 60 * 60 * 1000);
    const threeDaysAgo = now - (72 * 60 * 60 * 1000);

    const opened24h = rsvpConflictHistory.filter((c) => getGuestOpsTimestamp(c.created_at) >= dayAgo).length;
    const resolved24h = rsvpConflictHistory.filter((c) => getGuestOpsTimestamp(c.resolved_at) >= dayAgo).length;
    const unresolvedOver24h = rsvpConflicts.filter((c) => getGuestOpsTimestamp(c.created_at) < dayAgo).length;
    const unresolvedOver72h = rsvpConflicts.filter((c) => getGuestOpsTimestamp(c.created_at) < threeDaysAgo).length;

    const codeCounts = new Map<string, number>();
    for (const c of rsvpConflictHistory) {
      codeCounts.set(c.conflict_code, (codeCounts.get(c.conflict_code) ?? 0) + 1);
    }

    const topCodes = [...codeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([code, count]) => ({ code, count }));

    return {
      openNow: rsvpConflicts.length,
      opened24h,
      resolved24h,
      unresolvedOver24h,
      unresolvedOver72h,
      topCodes,
    };
  }, [rsvpConflicts.length, rsvpConflictHistory]);

  const resolveConflict = useCallback(async (conflictId: string) => {
    setResolvingConflictId(conflictId);
    try {
      if (isDemoMode) {
        setRsvpConflicts((prev) => prev.filter((c) => c.id !== conflictId));
        setRsvpConflictHistory((prev) => prev.map((c) => c.id === conflictId ? { ...c, resolved: true, resolved_at: new Date().toISOString() } : c));
        return;
      }
      const { error } = await supabase
        .from('rsvp_conflicts')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', conflictId);
      if (error) throw error;
      setRsvpConflicts((prev) => prev.filter((c) => c.id !== conflictId));
      setRsvpConflictHistory((prev) => prev.map((c) => c.id === conflictId ? { ...c, resolved: true, resolved_at: new Date().toISOString() } : c));
      toast('RSVP conflict marked resolved', 'success');
    } catch {
      toast('Failed to resolve RSVP conflict', 'error');
    } finally {
      setResolvingConflictId(null);
    }
  }, [isDemoMode, toast]);

  const resolveAllVisibleConflicts = useCallback(async () => {
    if (visibleRsvpConflicts.length === 0) return;
    setResolvingConflictId('all');
    try {
      const ids = visibleRsvpConflicts.map((c) => c.id);
      if (!isDemoMode) {
        const { error } = await supabase
          .from('rsvp_conflicts')
          .update({ resolved: true, resolved_at: new Date().toISOString() })
          .in('id', ids);
        if (error) throw error;
      }
      setRsvpConflicts((prev) => prev.filter((c) => !ids.includes(c.id)));
      setRsvpConflictHistory((prev) => prev.map((c) => ids.includes(c.id) ? { ...c, resolved: true, resolved_at: new Date().toISOString() } : c));
      toast(`${ids.length} RSVP conflict${ids.length === 1 ? '' : 's'} resolved`, 'success');
    } catch {
      toast('Failed to resolve RSVP conflicts', 'error');
    } finally {
      setResolvingConflictId(null);
    }
  }, [isDemoMode, toast, visibleRsvpConflicts]);

  const handleSaveRsvpConfig = async () => {
    setRsvpConfigSaving(true);
    try {
      const normalizedQuestions = rsvpQuestions
        .map((q) => ({
          ...q,
          label: q.label.trim(),
          options: (q.type === 'single_choice' || q.type === 'multi_choice') ? (q.options ?? []).map((o) => o.trim()).filter(Boolean) : [],
        }));

      const cleanedQuestions = normalizedQuestions.filter((q) => q.label.length > 0);

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

    const hasDraftQuestion = rsvpQuestions.some((q) => q.label.trim().length === 0);
    if (hasDraftQuestion) {
      setRsvpAutoSaveState('idle');
      if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
      return;
    }

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
    if (!error && data) return data as string;

    // Fallback for environments where the RPC is missing.
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  };

  const generateLocalInviteToken = () => `demo_${Math.random().toString(36).slice(2, 14)}`;

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuestsReadOnly) {
      toast('Viewer mode is read-only.', 'info');
      return;
    }
    if (!weddingSiteId) return;

    let createdGuestId: string | null = null;

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
      const selectedEventIds = Array.from(formEventInviteIds);
      const invitedToCeremony = selectedEventIds.includes('legacy-ceremony');
      const invitedToReception = selectedEventIds.includes('legacy-reception');
      const realEventIds = selectedEventIds.filter((id) => !id.startsWith('legacy-'));

      const { data: createdGuest, error } = await supabase
        .from('guests')
        .insert([{
          wedding_site_id: weddingSiteId,
          first_name: formData.first_name,
          last_name: formData.last_name,
          name: `${formData.first_name} ${formData.last_name}`,
          email: formData.email || null,
          phone: formData.phone || null,
          plus_one_allowed: formData.plus_one_allowed,
          invited_to_ceremony: invitedToCeremony,
          invited_to_reception: invitedToReception,
          invite_token: inviteToken,
          rsvp_status: 'pending',
        }])
        .select('id')
        .single();

      if (error) throw error;
      createdGuestId = createdGuest.id;

      if (createdGuest?.id && realEventIds.length > 0) {
        const rows = realEventIds.map((eventId) => ({ event_id: eventId, guest_id: createdGuest.id }));
        const { error: inviteError } = await supabase.from('event_invitations').insert(rows);
        if (inviteError) throw inviteError;
      }

      await fetchGuests();
      setShowAddModal(false);
      resetForm();
      toast(`${formData.first_name} ${formData.last_name} added`, 'success');
    } catch (err) {
      if (createdGuestId) {
        await supabase.from('guests').delete().eq('id', createdGuestId);
      }
      const msg = err instanceof Error ? err.message : 'Failed to add guest. Please try again.';
      toast(msg, 'error');
    }
  };

  const handleEditGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuestsReadOnly) {
      toast('Viewer mode is read-only.', 'info');
      return;
    }
    if (!editingGuest) return;

    const previousGuestValues = {
      first_name: editingGuest.first_name ?? null,
      last_name: editingGuest.last_name ?? null,
      name: editingGuest.name ?? null,
      email: editingGuest.email ?? null,
      phone: editingGuest.phone ?? null,
      plus_one_allowed: editingGuest.plus_one_allowed,
      invited_to_ceremony: editingGuest.invited_to_ceremony,
      invited_to_reception: editingGuest.invited_to_reception,
    };
    let previousInviteEventIds: string[] = [];
    let previousEventRsvpSnapshots: EventRsvpSnapshot[] = [];
    let guestUpdated = false;
    let invitesCleared = false;

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

      const selectedEventIds = Array.from(formEventInviteIds);
      const invitedToCeremony = selectedEventIds.includes('legacy-ceremony');
      const invitedToReception = selectedEventIds.includes('legacy-reception');
      const realEventIds = selectedEventIds.filter((id) => !id.startsWith('legacy-'));

      const { error } = await supabase
        .from('guests')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          name: `${formData.first_name} ${formData.last_name}`,
          email: formData.email || null,
          phone: formData.phone || null,
          plus_one_allowed: formData.plus_one_allowed,
          invited_to_ceremony: invitedToCeremony,
          invited_to_reception: invitedToReception,
        })
        .eq('id', editingGuest.id);

      if (error) throw error;
      guestUpdated = true;

      const { data: existingInvitationRows, error: existingInvitesError } = await supabase
        .from('event_invitations')
        .select('id, event_id')
        .eq('guest_id', editingGuest.id);
      if (existingInvitesError) throw existingInvitesError;

      previousInviteEventIds = (existingInvitationRows ?? []).map((row) => row.event_id as string);
      const existingInvitationIds = (existingInvitationRows ?? []).map((row) => row.id as string);
      if (existingInvitationIds.length > 0) {
        previousEventRsvpSnapshots = await getEventRsvpSnapshotsByInvitationIds(existingInvitationIds);
        await deleteEventRsvpsByInvitationIds(existingInvitationIds);
      }

      const { error: clearInvitesError } = await supabase
        .from('event_invitations')
        .delete()
        .eq('guest_id', editingGuest.id);
      if (clearInvitesError) throw clearInvitesError;
      invitesCleared = true;

      if (realEventIds.length > 0) {
        const rows = realEventIds.map((eventId) => ({ event_id: eventId, guest_id: editingGuest.id }));
        const { error: inviteError } = await supabase.from('event_invitations').insert(rows);
        if (inviteError) throw inviteError;
      }

      await fetchGuests();
      setEditingGuest(null);
      resetForm();
      toast('Guest updated', 'success');
    } catch {
      if (!isDemoMode) {
        if (invitesCleared) {
          const rollbackEventIds = previousInviteEventIds.filter((eventId) => !eventId.startsWith('legacy-'));
          if (rollbackEventIds.length > 0) {
            await supabase.from('event_invitations').insert(
              rollbackEventIds.map((eventId) => ({ event_id: eventId, guest_id: editingGuest.id })),
            );
            await restoreEventRsvpSnapshots(previousEventRsvpSnapshots);
          }
        }
        if (guestUpdated) {
          await supabase.from('guests').update(previousGuestValues).eq('id', editingGuest.id);
        }
      }
      toast('Failed to update guest. Please try again.', 'error');
    }
  };

  const [deletingGuestId, setDeletingGuestId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteGuest = async (guestId: string) => {
    if (isGuestsReadOnly) {
      toast('Viewer mode is read-only.', 'info');
      return;
    }
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

      const { data: invitationRows, error: invitationLookupError } = await supabase
        .from('event_invitations')
        .select('id')
        .eq('guest_id', guestId);
      if (invitationLookupError) throw invitationLookupError;

      const invitationIds = (invitationRows ?? []).map((row) => row.id as string);
      if (invitationIds.length > 0) {
        await deleteEventRsvpsByInvitationIds(invitationIds);
        const { error: inviteDeleteError } = await supabase
          .from('event_invitations')
          .delete()
          .eq('guest_id', guestId);
        if (inviteDeleteError) throw inviteDeleteError;
      }

      const { error: rsvpDeleteError } = await supabase
        .from('rsvps')
        .delete()
        .eq('guest_id', guestId);
      if (rsvpDeleteError) throw rsvpDeleteError;

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

  const handleUndoLastCheckIn = async () => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot update guest check-in.', 'info');
      return;
    }
    if (!weddingSiteId || !lastCheckIn || isDemoMode) return;
    try {
      const { error } = await supabase
        .from('guests')
        .update({ checked_in_at: null })
        .eq('id', lastCheckIn.guestId)
        .eq('wedding_site_id', weddingSiteId);
      if (error) throw error;
      await fetchGuests();
      toast(`Undid check-in for ${lastCheckIn.guestName}`, 'success');
      setLastCheckIn(null);
    } catch {
      toast('Failed to undo last check-in', 'error');
    }
  };

  const handleMarkThankYouSent = async (guest: GuestWithRSVP) => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot update thank-you status.', 'info');
      return;
    }
    if (!weddingSiteId || isDemoMode) return;
    try {
      const current = (guest as GuestWithRSVP & { thank_you_sent_at?: string | null }).thank_you_sent_at;
      const nextValue = current ? null : new Date().toISOString();
      const { error } = await supabase
        .from('guests')
        .update({ thank_you_sent_at: nextValue })
        .eq('id', guest.id)
        .eq('wedding_site_id', weddingSiteId);
      if (error) throw error;
      await fetchGuests();
      toast(nextValue ? 'Marked thank-you sent' : 'Cleared thank-you status', 'success');
    } catch {
      toast('Failed to update thank-you status', 'error');
    }
  };

  const handleMarkAllDueThankYous = async () => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot update thank-you status.', 'info');
      return;
    }
    if (!weddingSiteId || isDemoMode) return;
    const ids = guests.filter((g) => dueThankYouGuestIds.has(g.id)).map((g) => g.id);
    if (ids.length === 0) {
      toast('No guests currently due for thank-you.', 'error');
      return;
    }
    if (!window.confirm(`Mark thank-you sent for ${ids.length} guest(s)?`)) return;
    try {
      const { error } = await supabase
        .from('guests')
        .update({ thank_you_sent_at: new Date().toISOString() })
        .in('id', ids)
        .eq('wedding_site_id', weddingSiteId);
      if (error) throw error;
      await fetchGuests();
      toast(`Marked ${ids.length} thank-you sent`, 'success');
    } catch {
      toast('Failed to mark thank-you statuses', 'error');
    }
  };

  const handleClearAllCheckIns = async () => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot clear guest check-ins.', 'info');
      return;
    }
    if (!weddingSiteId || isDemoMode) return;
    const checkedInCount = guests.filter((g) => !!(g as GuestWithRSVP & { checked_in_at?: string | null }).checked_in_at).length;
    if (checkedInCount === 0) {
      toast('No checked-in guests to clear.', 'error');
      return;
    }
    if (!window.confirm(`Clear check-in for ${checkedInCount} guest(s)?`)) return;
    try {
      const { error } = await supabase
        .from('guests')
        .update({ checked_in_at: null, checkin_notes: null })
        .eq('wedding_site_id', weddingSiteId)
        .not('checked_in_at', 'is', null);
      if (error) throw error;
      await fetchGuests();
      setLastCheckIn(null);
      toast('Cleared all check-ins', 'success');
    } catch {
      toast('Failed to clear check-ins', 'error');
    }
  };

  const [lastCheckIn, setLastCheckIn] = useState<{ guestId: string; guestName: string; at: number } | null>(null);

  const handleToggleCheckIn = async (guest: GuestWithRSVP) => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot update guest check-in.', 'info');
      return;
    }
    if (!weddingSiteId || isDemoMode) {
      toast('Check-in is unavailable in demo mode.', 'error');
      return;
    }

    const nextValue = guest.checked_in_at ? null : new Date().toISOString();
    const updateCheckin = async () => {
      const { error } = await supabase
        .from('guests')
        .update({ checked_in_at: nextValue })
        .eq('id', guest.id)
        .eq('wedding_site_id', weddingSiteId);
      if (error) throw error;
    };

    try {
      await updateCheckin();
      await fetchGuests();
      if (nextValue) {
        const guestName = (guest.first_name || guest.last_name)
          ? `${guest.first_name ?? ''} ${guest.last_name ?? ''}`.trim()
          : guest.name;
        setLastCheckIn({ guestId: guest.id, guestName, at: Date.now() });
      }
      toast(nextValue ? 'Guest checked in' : 'Guest check-in cleared', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const authish = msg.includes('invalid jwt') || msg.includes('jwt') || msg.includes('401') || msg.includes('auth');
      if (authish) {
        try {
          await supabase.auth.refreshSession();
          await updateCheckin();
          await fetchGuests();
          toast(nextValue ? 'Guest checked in' : 'Guest check-in cleared', 'success');
          return;
        } catch {
          // fall through to canonical error toast
        }
      }
      toast('Failed to update check-in status', 'error');
    }
  };

  const handleSendInvitation = async (guest: GuestWithRSVP) => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot send guest invitations.', 'info');
      return;
    }
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

  const handleCopyExceptionChecklist = async () => {
    const lines = filteredGuests.flatMap((guest) => {
      const states = exceptionStateByGuest.get(guest.id) || [];
      if (!states.length) return [];
      const name = guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.name;
      return [`- ${name}: resolve ${states.join(', ')}`];
    });
    if (lines.length === 0) {
      toast('No RSVP exceptions in this segment.', 'error');
      return;
    }
    const payload = lines.join('\n');
    try {
      await navigator.clipboard.writeText(payload);
      toast(`Copied RSVP exception checklist for ${lines.length} guest${lines.length === 1 ? '' : 's'}`, 'success');
    } catch {
      window.prompt('Copy RSVP exception checklist:', payload);
    }
  };

  const handleCopyMissingMealChecklist = async () => {
    const guestsNeedingMeals = filteredGuests.filter((guest) => isAttendingRsvpStatus(guest.rsvp_status) && !guest.rsvp?.meal_choice);
    if (guestsNeedingMeals.length === 0) {
      toast('No missing meal choices in this segment.', 'error');
      return;
    }
    const payload = guestsNeedingMeals.map((guest) => `- ${guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.name}: confirm meal choice`).join('\n');
    try {
      await navigator.clipboard.writeText(payload);
      toast(`Copied meal follow-up checklist for ${guestsNeedingMeals.length} guest${guestsNeedingMeals.length === 1 ? '' : 's'}`, 'success');
    } catch {
      window.prompt('Copy meal follow-up checklist:', payload);
    }
  };

  const handleCopyNoContactChecklist = async () => {
    const noContactGuests = filteredGuests.filter((guest) => !guest.email && !guest.phone);
    if (noContactGuests.length === 0) {
      toast('No no-contact guests in this segment.', 'error');
      return;
    }

    const { data: siteData } = weddingSiteId
      ? await supabase
          .from('wedding_sites')
          .select('id, site_slug, site_url')
          .eq('id', weddingSiteId)
          .maybeSingle()
      : { data: null };

    const publicSlug = resolvePublicSiteSlugFromRow((siteData as Record<string, unknown> | null) ?? null);
    const payload = publicSlug
      ? buildNoContactChecklistPayload(
          `https://${publicSlug}.dayof.love`,
          publicSlug,
          noContactGuests.map((guest) => ({
            name: guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.name,
            inviteToken: guest.invite_token,
          })),
        )
      : noContactGuests.map((guest) => `- ${guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.name}: get phone or email, then resend invite`).join('\n');

    try {
      await navigator.clipboard.writeText(payload);
      toast(`Copied no-contact checklist for ${noContactGuests.length} guest${noContactGuests.length === 1 ? '' : 's'}`, 'success');
    } catch {
      window.prompt('Copy no-contact checklist:', payload);
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
    toast(`Created ${tasks.length} follow-up task${tasks.length === 1 ? '' : 's'}`, 'success');
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
    let failedCount = 0;
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
          const sentAtIso = new Date().toISOString();
          const { error: guestUpdateError } = await supabase
            .from('guests')
            .update({ invitation_sent_at: sentAtIso, reminder_last_sent_at: sentAtIso })
            .eq('id', guest.id);
          if (guestUpdateError) throw guestUpdateError;
          successCount += 1;
        } catch {
          failedCount += 1;
          // continue
        }
      }
      if (successCount > 0) {
        await fetchGuests();
      }
      toast(
        successCount > 0
          ? (failedCount > 0
              ? `Sent ${successCount} selected reminder${successCount === 1 ? '' : 's'}, failed ${failedCount}`
              : `Sent ${successCount} selected reminder${successCount === 1 ? '' : 's'}`)
          : (failedCount > 0
              ? `All ${failedCount} selected reminder${failedCount === 1 ? '' : 's'} failed.`
              : 'No selected reminders were sent.'),
        successCount > 0 ? (failedCount > 0 ? 'info' : 'success') : 'error',
      );
    } finally {
      setBulkSending(false);
    }
  };

const handleSendBulkInvitations = async () => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot send guest reminders from this view.', 'info');
      return;
    }
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
Skip recent (${reminderCadenceDays}d cadence): ${skipRecentlyInvited ? "On" : "Off"}${noContactWarning}${previewText}

Proceed with send?`)) return;

    if (isDemoMode) {
      const sentAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setCampaignLog(prev => [{ id: Date.now(), segment: segmentLabelMap[filterStatus] || filterStatus, count: reminderCandidates.length, sentAt }, ...prev].slice(0, 6));
      toast(`Demo: simulated reminders for ${reminderCandidates.length} guests`, 'success');
      return;
    }

    setBulkSending(true);
    let successCount = 0;
    let failedCount = 0;

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

          const sentAtIso = new Date().toISOString();
          const { error: guestUpdateError } = await supabase
            .from('guests')
            .update({ invitation_sent_at: sentAtIso, reminder_last_sent_at: sentAtIso })
            .eq('id', guest.id);
          if (guestUpdateError) throw guestUpdateError;

          successCount += 1;
        } catch {
          failedCount += 1;
          // continue sending others
        }
      }

      if (successCount > 0) {
        const sentAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setCampaignLog(prev => [{ id: Date.now(), segment: segmentLabelMap[filterStatus] || filterStatus, count: successCount, sentAt }, ...prev].slice(0, 6));
        toast(
          failedCount > 0
            ? `Sent ${successCount} reminder${successCount === 1 ? '' : 's'}, failed ${failedCount}`
            : `Sent ${successCount} reminder${successCount === 1 ? '' : 's'}`,
          failedCount > 0 ? 'info' : 'success',
        );
        await fetchGuests();
      } else {
        toast(failedCount > 0 ? `All ${failedCount} reminder${failedCount === 1 ? '' : 's'} failed.` : 'No reminders were sent. Please try again.', 'error');
      }
    } finally {
      setBulkSending(false);
    }
  };

  const handleSendDueRemindersNow = async () => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot send due reminders.', 'info');
      return;
    }
    if (dueReminderCandidatesGlobal.length === 0) {
      toast('No guests are currently due for reminders.', 'error');
      return;
    }

    if (!window.confirm(`Send due reminders now?\nRecipients: ${dueReminderCandidatesGlobal.length}\nCadence: ${reminderCadenceDays} day(s)`)) return;

    if (isDemoMode) {
      const sentAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setCampaignLog(prev => [{ id: Date.now(), segment: 'Due Reminder', count: dueReminderCandidatesGlobal.length, sentAt }, ...prev].slice(0, 6));
      toast(`Demo: simulated reminders for ${dueReminderCandidatesGlobal.length} due guests`, 'success');
      return;
    }

    setBulkSending(true);
    let successCount = 0;
    let failedCount = 0;
    try {
      for (const guest of dueReminderCandidatesGlobal) {
        if (!guest.email) continue;
        const guestName = guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.name;
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
          const { error: guestUpdateError } = await supabase
            .from('guests')
            .update({ reminder_last_sent_at: new Date().toISOString() })
            .eq('id', guest.id);
          if (guestUpdateError) throw guestUpdateError;
          successCount += 1;
        } catch {
          failedCount += 1;
          // continue
        }
      }

      if (successCount > 0) {
        const sentAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setCampaignLog(prev => [{ id: Date.now(), segment: 'Due Reminder', count: successCount, sentAt }, ...prev].slice(0, 6));
        toast(
          failedCount > 0
            ? `Sent ${successCount} due reminder${successCount === 1 ? '' : 's'}, failed ${failedCount}`
            : `Sent ${successCount} due reminder${successCount === 1 ? '' : 's'}`,
          failedCount > 0 ? 'info' : 'success',
        );
        await fetchGuests();
      } else {
        toast(failedCount > 0 ? `All ${failedCount} due reminder${failedCount === 1 ? '' : 's'} failed.` : 'No due reminders were sent. Please try again.', 'error');
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

  const persistReminderSettings = async (patch: { reminder_cadence_days?: 1 | 3 | 7; auto_reminders_enabled?: boolean }) => {
    if (!weddingSiteId || isDemoMode) return;
    const { error } = await supabase
      .from('wedding_sites')
      .update(patch)
      .eq('id', weddingSiteId);
    if (error) throw error;
  };

  async function copyContactRequestLink(targetGuest?: Pick<GuestWithRSVP, 'invite_token'>) {
    if (!weddingSiteId) {
      toast('Missing wedding site context', 'error');
      return;
    }

    const { data: siteData, error: siteError } = await supabase
      .from('wedding_sites')
      .select('id, site_slug, site_url')
      .eq('id', weddingSiteId)
      .maybeSingle();

    const publicSlug = resolvePublicSiteSlugFromRow((siteData as Record<string, unknown> | null) ?? null);
    if (siteError || !publicSlug) {
      toast('Set a public site slug before sharing the guest update link', 'error');
      return;
    }

    if (!targetGuest?.invite_token) {
      toast('Open a guest with an invitation link before copying a guest update link.', 'error');
      return;
    }

    const url = buildGuestContactUpdateUrl(`https://${publicSlug}.dayof.love`, publicSlug, targetGuest.invite_token);
    try {
      await navigator.clipboard.writeText(url);
      toast('Guest update link copied', 'success');
    } catch {
      window.prompt('Copy contact link:', url);
    }
  }

  async function handleCopyFilteredGuestUpdateLinks() {
    if (!weddingSiteId) {
      toast('Missing wedding site context', 'error');
      return;
    }

    const { data: siteData, error: siteError } = await supabase
      .from('wedding_sites')
      .select('id, site_slug, site_url')
      .eq('id', weddingSiteId)
      .maybeSingle();

    const publicSlug = resolvePublicSiteSlugFromRow((siteData as Record<string, unknown> | null) ?? null);
    if (siteError || !publicSlug) {
      toast('Set a public site slug before sharing guest update links', 'error');
      return;
    }

    if (filteredGuestUpdateRecipients.length === 0) {
      toast('No guests in this segment have invitation links yet.', 'error');
      return;
    }

    const payload = buildGuestContactLinkListPayload(`https://${publicSlug}.dayof.love`, publicSlug, filteredGuestUpdateRecipients);
    try {
      await navigator.clipboard.writeText(payload);
      toast(`Copied ${filteredGuestUpdateRecipients.length} guest update link${filteredGuestUpdateRecipients.length === 1 ? '' : 's'}`, 'success');
    } catch {
      window.prompt('Copy guest update links:', payload);
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
      if (eventsResult.error) throw eventsResult.error;
      if (invitesResult.error) throw invitesResult.error;
      if (!isDemoMode && auditResult.error) throw auditResult.error;
      setItineraryEvents((eventsResult.data ?? []) as ItineraryEvent[]);
      setGuestEventIds(new Set((invitesResult.data ?? []).map((r: { event_id: string }) => r.event_id)));
      if (!isDemoMode) {
        setGuestAuditEntries((auditResult.data ?? []) as GuestAuditEntry[]);
      }
    } catch {
      toast('Couldn’t load guest itinerary details right now. Please try again.', 'error');
    } finally {
      setLoadingDrawer(false);
    }
  }

  async function handleToggleEventInvite(eventId: string, currentlyInvited: boolean) {
    if (!itineraryDrawerGuest || togglingEventId) return;
    setTogglingEventId(eventId);
    try {
      if (currentlyInvited) {
        const { data: invitationRow, error: invitationLookupError } = await supabase
          .from('event_invitations')
          .select('id')
          .eq('event_id', eventId)
          .eq('guest_id', itineraryDrawerGuest.id)
          .maybeSingle();
        if (invitationLookupError) throw invitationLookupError;

        const eventRsvpSnapshots = invitationRow?.id
          ? await getEventRsvpSnapshotsByInvitationIds([invitationRow.id])
          : [];

        if (invitationRow?.id) {
          await deleteEventRsvpByInvitationId(invitationRow.id);
        }

        const { error: inviteDeleteError } = await supabase
          .from('event_invitations')
          .delete()
          .eq('event_id', eventId)
          .eq('guest_id', itineraryDrawerGuest.id);
        if (inviteDeleteError) {
          await restoreEventRsvpSnapshots(eventRsvpSnapshots);
          throw inviteDeleteError;
        }
        setGuestEventIds(prev => { const n = new Set(prev); n.delete(eventId); return n; });
      } else {
        const { error: inviteInsertError } = await supabase
          .from('event_invitations')
          .insert({ event_id: eventId, guest_id: itineraryDrawerGuest.id });
        if (inviteInsertError) throw inviteInsertError;
        setGuestEventIds(prev => new Set([...prev, eventId]));
      }
    } catch {
      toast('Failed to update event invitation', 'error');
    } finally {
      setTogglingEventId(null);
    }
  }

  const households = useMemo(() => {
    const byName = (a: GuestWithRSVP, b: GuestWithRSVP) => {
      const aLast = (a.last_name || '').toLowerCase();
      const bLast = (b.last_name || '').toLowerCase();
      if (aLast !== bLast) return aLast.localeCompare(bLast);
      const aFirst = (a.first_name || '').toLowerCase();
      const bFirst = (b.first_name || '').toLowerCase();
      if (aFirst !== bFirst) return aFirst.localeCompare(bFirst);
      return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
    };

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

    const grouped = [...map.entries()]
      .map(([id, members]) => [id, [...members].sort(byName)] as [string, GuestWithRSVP[]])
      .sort((a, b) => byName(a[1][0], b[1][0]));

    return { grouped, ungrouped: [...ungrouped].sort(byName) };
  }, [guests]);

  const openAssistedRsvpModal = (guest: GuestWithRSVP) => {
    setAssistedRsvpGuest(guest);
    setAssistedRsvpStatus(isDeclinedRsvpStatus(guest.rsvp_status) ? 'declined' : 'confirmed');
    setAssistedRsvpSource('phone');
    setAssistedRsvpNotes('');
  };

  const handleSaveAssistedRsvp = async () => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot record assisted RSVPs.', 'info');
      return;
    }
    if (!assistedRsvpGuest) return;
    let persisted = false;
    try {
      setAssistedRsvpSaving(true);
      const recordedAt = new Date().toISOString();
      const manualTag = `[Manual RSVP source:${assistedRsvpSource} recorded:${recordedAt}]`;
      const nextNotes = [manualTag, assistedRsvpNotes.trim()].filter(Boolean).join(' ');

      if (isDemoMode) {
        setGuests((prev) => prev.map((guest) => guest.id === assistedRsvpGuest.id ? {
          ...guest,
          rsvp_status: assistedRsvpStatus,
          rsvp_received_at: new Date().toISOString(),
          notes: nextNotes,
          rsvp: assistedRsvpStatus === 'confirmed'
            ? guest.rsvp
              ? {
                  ...guest.rsvp,
                  attending: true,
                  attending_ceremony: guest.invited_to_ceremony,
                  attending_reception: guest.invited_to_reception,
                }
              : guest.rsvp
            : guest.rsvp
              ? {
                  ...guest.rsvp,
                  attending: false,
                  attending_ceremony: false,
                  attending_reception: false,
                  meal_choice: null,
                  plus_one_name: null,
                  plus_one_count: 0,
                }
              : guest.rsvp,
        } : guest));
        setAssistedRsvpGuest(null);
        toast('RSVP recorded for guest', 'success');
        return;
      }
      const { error: guestError } = await supabase
        .from('guests')
        .update({ rsvp_status: assistedRsvpStatus, rsvp_received_at: recordedAt, notes: nextNotes })
        .eq('id', assistedRsvpGuest.id);
      if (guestError) throw guestError;

      const { data: existingRsvp, error: existingRsvpError } = await supabase
        .from('rsvps')
        .select('id, notes')
        .eq('guest_id', assistedRsvpGuest.id)
        .maybeSingle();
      if (existingRsvpError) throw existingRsvpError;

      const nextAttending = assistedRsvpStatus === 'confirmed';
      const assistedRsvpPayload = {
        attending: nextAttending,
        attending_ceremony: nextAttending ? assistedRsvpGuest.invited_to_ceremony : false,
        attending_reception: nextAttending ? assistedRsvpGuest.invited_to_reception : false,
        notes: nextNotes,
        responded_at: recordedAt,
        ...(nextAttending ? {} : {
          meal_choice: null,
          plus_one_name: null,
          plus_one_count: 0,
        }),
      };

      if (existingRsvp?.id) {
        const { error: rsvpError } = await supabase
          .from('rsvps')
          .update(assistedRsvpPayload)
          .eq('id', existingRsvp.id);
        if (rsvpError) throw rsvpError;
      } else {
        const { error: rsvpInsertError } = await supabase
          .from('rsvps')
          .insert({
            guest_id: assistedRsvpGuest.id,
            ...assistedRsvpPayload,
          });
        if (rsvpInsertError) throw rsvpInsertError;
      }

      persisted = true;

      await fetchGuests();
      setAssistedRsvpGuest(null);
      toast('RSVP recorded for guest', 'success');
    } catch (error) {
      if (!isDemoMode && assistedRsvpGuest && !persisted) {
        await supabase
          .from('guests')
          .update({
            rsvp_status: assistedRsvpGuest.rsvp_status,
            rsvp_received_at: assistedRsvpGuest.rsvp_received_at ?? null,
            notes: assistedRsvpGuest.notes ?? null,
          })
          .eq('id', assistedRsvpGuest.id);
      }
      console.error(error);
      toast('Failed to save assisted RSVP', 'error');
    } finally {
      setAssistedRsvpSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      plus_one_allowed: false,
      require_plus_one_name: false,
      invited_to_ceremony: true,
      invited_to_reception: true,
    });
    setFormEventInviteIds(new Set(effectiveItineraryEvents.map((e) => e.id)));
  };

  const openEditModal = (guest: GuestWithRSVP) => {
    if (isGuestsReadOnly) {
      toast('Viewer mode is read-only.', 'info');
      return;
    }
    setEditingGuest(guest);
    setFormData({
      first_name: guest.first_name || '',
      last_name: guest.last_name || '',
      email: guest.email || '',
      phone: guest.phone || '',
      plus_one_allowed: guest.plus_one_allowed,
      require_plus_one_name: false,
      invited_to_ceremony: guest.invited_to_ceremony,
      invited_to_reception: guest.invited_to_reception,
    });
    const invitedIds = effectiveItineraryEvents
      .filter((event) => {
        if (event.id === 'legacy-ceremony') return guest.invited_to_ceremony;
        if (event.id === 'legacy-reception') return guest.invited_to_reception;
        return eventInviteGuestMap.get(event.id)?.has(guest.id);
      })
      .map((event) => event.id);
    setFormEventInviteIds(new Set(invitedIds));
  };

  const exportCSV = (rowsSource: GuestWithRSVP[] = guests, suffix = 'guests') => {
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Status', 'Plus One', 'Meal Choice', 'RSVP Date', 'Invite Token', 'Custom Answers'];
    const rows = rowsSource.map(guest => [
      guest.first_name || '',
      guest.last_name || '',
      guest.email || '',
      guest.phone || '',
      guest.rsvp_status,
      guest.plus_one_allowed ? 'Yes' : 'No',
      guest.rsvp?.meal_choice || '',
      guest.rsvp_received_at ? formatGuestOpsDate(guest.rsvp_received_at, undefined, '') : '',
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

  const exportRsvpRespondersCSV = () => {
    const responders = guests.filter((g) => hasRespondedRsvpStatus(g.rsvp_status));
    exportCSV(responders, 'guests-rsvp-responders');
  };

  const exportPendingGuestsCSV = () => {
    exportCSV(guests.filter((g) => isPendingRsvpStatus(g.rsvp_status)), 'guests-pending-rsvp');
  };

  const exportMissingMealCSV = () => {
    exportCSV(guests.filter((g) => g.rsvp?.attending && !g.rsvp?.meal_choice), 'guests-missing-meal');
  };

  const exportAttendingGuestsCSV = () => {
    exportCSV(guests.filter((g) => isAttendingRsvpStatus(g.rsvp_status)), 'guests-attending');
  };

  const exportDeclinedGuestsCSV = () => {
    exportCSV(guests.filter((g) => isDeclinedRsvpStatus(g.rsvp_status)), 'guests-declined');
  };

  const exportThankYouDueCSV = () => {
    const due = guests.filter((g) => dueThankYouGuestIds.has(g.id));
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'RSVP Status', 'Thank You Sent At'];
    const rows = due.map((guest) => [
      guest.first_name || '',
      guest.last_name || '',
      guest.email || '',
      guest.phone || '',
      guest.rsvp_status,
      (guest as GuestWithRSVP & { thank_you_sent_at?: string | null }).thank_you_sent_at || '',
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `thank-you-due_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportCheckedInCSV = () => {
    const checkedIn = guests.filter((g) => !!(g as GuestWithRSVP & { checked_in_at?: string | null }).checked_in_at);
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Checked In At'];
    const rows = checkedIn.map((guest) => [
      guest.first_name || '',
      guest.last_name || '',
      guest.email || '',
      guest.phone || '',
      (guest as GuestWithRSVP & { checked_in_at?: string | null }).checked_in_at || '',
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `checked-in-guests_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copySmsRsvpLinksForFiltered = async () => {
    if (!weddingSiteId) {
      toast('Missing wedding site context', 'error');
      return;
    }

    const { data: siteData, error: siteError } = await supabase
      .from('wedding_sites')
      .select('site_slug')
      .eq('id', weddingSiteId)
      .single();
    if (siteError || !siteData?.site_slug) {
      toast('Missing site slug', 'error');
      return;
    }

    const rows = smsRsvpLinkCandidates
      .map((g) => {
        const name = (g.first_name || g.last_name) ? `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim() : g.name;
        const link = buildRsvpInviteUrl(`https://${siteData.site_slug}.dayof.love`, g.invite_token!);
        return `${name}: ${link}`;
      });

    if (rows.length === 0) {
      toast('No RSVP links available for this segment.', 'error');
      return;
    }

    const payload = rows.join('\n');
    try {
      await navigator.clipboard.writeText(payload);
      toast(`Copied ${rows.length} SMS RSVP link${rows.length === 1 ? '' : 's'}`, 'success');
    } catch {
      window.prompt('Copy SMS RSVP links:', payload);
    }
  };

  const exportAddressCollectionCSV = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Address Line 1', 'Address Line 2', 'City', 'State/Province', 'ZIP/Postal', 'Country'];
    const rows = guests.map((guest) => {
      const row = guest as GuestWithRSVP & {
        mailing_address_line1?: string | null;
        mailing_address_line2?: string | null;
        mailing_city?: string | null;
        mailing_state?: string | null;
        mailing_postal_code?: string | null;
        mailing_country?: string | null;
      };
      return [
        guest.first_name || '',
        guest.last_name || '',
        guest.email || '',
        guest.phone || '',
        row.mailing_address_line1 || '',
        row.mailing_address_line2 || '',
        row.mailing_city || '',
        row.mailing_state || '',
        row.mailing_postal_code || '',
        row.mailing_country || '',
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `guest-addresses_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleNuclearDeleteAllGuests = async () => {
    if (!weddingSiteId || isDemoMode) {
      toast('Nuclear delete is unavailable in demo mode.', 'error');
      return;
    }

    const required = String(guests.length);
    if (nuclearConfirmInput.trim() !== required) {
      toast(`Type ${required} to confirm deletion.`, 'error');
      return;
    }

    setNuclearDeleting(true);
    try {
      const { data: guestRows, error: guestReadError } = await supabase
        .from('guests')
        .select('id')
        .eq('wedding_site_id', weddingSiteId);
      if (guestReadError) throw guestReadError;

      const guestIds = (guestRows ?? []).map((g) => g.id as string);

      // Best-effort dependency cleanup for environments without full FK cascades.
      if (guestIds.length > 0) {
        const { data: invitationRows } = await supabase
          .from('event_invitations')
          .select('id')
          .in('guest_id', guestIds);

        const invitationIds = (invitationRows ?? []).map((row) => row.id as string);

        if (invitationIds.length > 0) {
          await deleteEventRsvpsByInvitationIds(invitationIds);
        }
        const { error: eventInvitationDeleteError } = await supabase.from('event_invitations').delete().in('guest_id', guestIds);
        if (eventInvitationDeleteError) throw eventInvitationDeleteError;
        const { error: rsvpDeleteError } = await supabase.from('rsvps').delete().in('guest_id', guestIds);
        if (rsvpDeleteError) throw rsvpDeleteError;
      }

      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('wedding_site_id', weddingSiteId);
      if (error) throw error;

      await fetchGuests();
      setSelectedGuestIds(new Set());
      setShowNuclearDeleteModal(false);
      setNuclearConfirmInput('');
      toast(`Deleted ${required} guests.`, 'success');
    } catch (err) {
      const errObj = err as { message?: string; details?: string; code?: string } | null;
      const msg = errObj?.message || errObj?.details || 'Failed to delete all guests. Please try again.';
      const code = errObj?.code ? ` (${errObj.code})` : '';
      toast(`${msg}${code}`, 'error');
    } finally {
      setNuclearDeleting(false);
    }
  };

  const buildCsvPreviewFromMapping = useCallback(async (headers: string[], dataRows: string[][], fieldMap: CsvFieldMap) => {
    if (fieldMap.first_name < 0 || fieldMap.last_name < 0) {
      toast('Please map both First Name and Last Name.', 'error');
      return;
    }

    let resolvedSiteId = weddingSiteId;
    if (!resolvedSiteId && !isDemoMode) {
      const { data: site } = await supabase
        .from('wedding_sites')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();
      resolvedSiteId = (site?.id as string | null) ?? null;
      if (resolvedSiteId) setWeddingSiteId(resolvedSiteId);
    }
    if (!resolvedSiteId && !isDemoMode) {
      toast('Could not find your website right now. Refresh and try again.', 'error');
      return;
    }

    const normalizeEventName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
    const itineraryByNormalizedName = new Map(itineraryEvents.map((ev) => [normalizeEventName(ev.event_name), ev.id] as const));
    const inviteEventColumns = headers
      .map((h, idx) => ({ h, idx }))
      .filter(({ h }) => {
        if (h.startsWith('invite:')) return true;
        return itineraryByNormalizedName.has(normalizeEventName(h));
      });

    const weakMappings = [
      fieldMap.full_name >= 0 && (fieldMap.first_name < 0 || fieldMap.last_name < 0) ? 'Full name is carrying first/last split' : '',
      fieldMap.household_name >= 0 && fieldMap.household_id < 0 ? 'Households rely on name/group matching only' : '',
      fieldMap.email < 0 && fieldMap.phone < 0 ? 'No direct contact column mapped' : '',
      inviteEventColumns.length === 0 && fieldMap.invited_events.length === 0 ? 'No event-invite mapping detected' : '',
    ].filter(Boolean);

    setCsvMappingSummary({
      core: [
        fieldMap.first_name >= 0 ? 'First Name' : '',
        fieldMap.last_name >= 0 ? 'Last Name' : '',
        fieldMap.email >= 0 ? 'Email' : '',
        fieldMap.phone >= 0 ? 'Phone' : '',
        fieldMap.plus_one >= 0 ? 'Plus One' : '',
      ].filter(Boolean),
      rsvp: [
        fieldMap.status >= 0 ? 'Status → RSVP status' : '',
        fieldMap.meal_choice >= 0 ? 'Meal Choice → RSVP meal' : '',
        fieldMap.rsvp_date >= 0 ? 'RSVP Date → RSVP responded_at' : '',
        fieldMap.invite_token >= 0 ? 'Invite Token → guest token' : '',
      ].filter(Boolean),
      household: [
        fieldMap.household_id >= 0 ? 'household_id' : '',
        fieldMap.household_name >= 0 ? 'household_name / group_name' : '',
      ].filter(Boolean),
      eventCols: inviteEventColumns.map(({ h }) => h),
      weak: weakMappings,
    });

    const skipped: string[] = [];
    const unknownEvents = new Set<string>();
    const parsed: Record<string, unknown>[] = [];

    dataRows.forEach((row, idx) => {
      const values = (row || []).map((v) => String(v ?? '').trim());
      const firstName = fieldMap.first_name >= 0 ? (values[fieldMap.first_name] || '') : '';
      const lastName = fieldMap.last_name >= 0 ? (values[fieldMap.last_name] || '') : '';

      const email = fieldMap.email >= 0 ? (values[fieldMap.email] || null) : null;
      const phone = fieldMap.phone >= 0 ? (values[fieldMap.phone] || null) : null;
      const plusRaw = fieldMap.plus_one >= 0 ? (values[fieldMap.plus_one] || '') : '';
      const plusOneAllowed = ['yes', 'true', '1', 'y'].includes(plusRaw.toLowerCase());
      const statusRaw = fieldMap.status >= 0 ? (values[fieldMap.status] || '').toLowerCase().trim() : '';
      const normalizedStatus: 'pending' | 'confirmed' | 'declined' =
        ['confirmed', 'attending', 'accepted', 'yes'].includes(statusRaw)
          ? 'confirmed'
          : ['declined', 'no', 'not attending', 'rejected'].includes(statusRaw)
            ? 'declined'
            : 'pending';
      const mealChoice = fieldMap.meal_choice >= 0 ? (values[fieldMap.meal_choice] || '').trim() : '';
      const rsvpDateRaw = fieldMap.rsvp_date >= 0 ? (values[fieldMap.rsvp_date] || '').trim() : '';
      const parsedRsvpDate = rsvpDateRaw ? new Date(rsvpDateRaw) : null;
      const inviteTokenRaw = fieldMap.invite_token >= 0 ? (values[fieldMap.invite_token] || '').trim() : '';
      const householdIdRaw = fieldMap.household_id >= 0 ? (values[fieldMap.household_id] || '').trim() : '';
      const householdNameRaw = fieldMap.household_name >= 0 ? (values[fieldMap.household_name] || '').trim() : '';
      const householdKey = householdIdRaw ? `id:${householdIdRaw.toLowerCase()}` : householdNameRaw ? `name:${householdNameRaw.toLowerCase()}` : '';

      const invitedEventIds = new Set<string>();
      if (fieldMap.invited_events.length > 0) {
        fieldMap.invited_events.forEach((colIdx) => {
          const raw = values[colIdx] || '';
          raw.split(/[|,;]/).map((x) => x.trim()).filter(Boolean).forEach((eventName) => {
            const eventId = itineraryByNormalizedName.get(normalizeEventName(eventName));
            if (eventId) invitedEventIds.add(eventId);
            else unknownEvents.add(eventName);
          });
        });
      }

      inviteEventColumns.forEach(({ h, idx: colIdx }) => {
        const eventName = (h.startsWith('invite:') ? h.replace(/^invite:/, '') : h).trim();
        const eventId = itineraryByNormalizedName.get(normalizeEventName(eventName));
        if (!eventId) {
          unknownEvents.add(eventName);
          return;
        }
        const raw = (values[colIdx] || '').toLowerCase().trim();
        const truthy = ['yes', 'true', '1', 'y', 'invited', 'include'].includes(raw);
        const falsey = ['no', 'false', '0', 'n', 'not invited', 'exclude'].includes(raw);
        if (truthy) invitedEventIds.add(eventId);
        if (falsey) invitedEventIds.delete(eventId);
      });

      if (!firstName || !lastName) {
        skipped.push(`Row ${idx + 2}: missing first or last name`);
        return;
      }

      parsed.push({
        wedding_site_id: resolvedSiteId,
        first_name: firstName || null,
        last_name: lastName || null,
        name: `${firstName || ''} ${lastName || ''}`.trim() || (email || 'Guest'),
        email,
        phone,
        group_name: householdNameRaw || null,
        plus_one_allowed: plusOneAllowed,
        rsvp_status: normalizedStatus,
        rsvp_received_at: hasRespondedRsvpStatus(normalizedStatus)
          ? (parsedRsvpDate && !Number.isNaN(parsedRsvpDate.getTime()) ? parsedRsvpDate.toISOString() : new Date().toISOString())
          : null,
        invite_token: inviteTokenRaw || null,
        invited_to_ceremony: true,
        invited_to_reception: true,
        __household_key: householdKey || null,
        __invited_event_ids: Array.from(invitedEventIds),
        __meal_choice: mealChoice || null,
        __rsvp_date: parsedRsvpDate && !Number.isNaN(parsedRsvpDate.getTime()) ? parsedRsvpDate.toISOString() : null,
      });
    });

    const householdWarnings = new Set<string>();
    const householdGroups = new Map<string, Array<{ lastName: string; label: string }>>();
    parsed.forEach((row) => {
      const key = String((row.__household_key as string | null | undefined) || '');
      if (!key) return;
      const lastName = String(row.last_name || '').trim().toLowerCase();
      const label = String(row.group_name || key.replace(/^name:/, ''));
      const existing = householdGroups.get(key) ?? [];
      existing.push({ lastName, label });
      householdGroups.set(key, existing);
    });
    householdGroups.forEach((members, key) => {
      if (!key.startsWith('name:')) return;
      const lastNames = Array.from(new Set(members.map((m) => m.lastName).filter(Boolean)));
      if (members.length > 1 && lastNames.length > 1) householdWarnings.add(`${members[0]?.label || key}: mixed last names under name-only household key`);
    });

    const duplicateNameCounts = new Map<string, number>();
    parsed.forEach((row) => {
      const key = `${String(row.first_name || '').trim().toLowerCase()}|${String(row.last_name || '').trim().toLowerCase()}`;
      if (!key || key === '|') return;
      duplicateNameCounts.set(key, (duplicateNameCounts.get(key) || 0) + 1);
    });
    const duplicateNames = Array.from(duplicateNameCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([key, count]) => {
        const [first, last] = key.split('|');
        return `${first} ${last} (${count})`;
      });

    if (parsed.length === 0) {
      setCsvUnknownEvents([]);
      setCsvDuplicateNames([]);
      toast('No valid guests found in the file. All rows were skipped.', 'error');
      return;
    }

    setCsvPreview(parsed);
    setCsvSkipped(skipped);
    setCsvUnknownEvents(Array.from(unknownEvents));
    setCsvDuplicateNames(duplicateNames);
    setCsvShowMapper(false);
    setCsvHouseholdWarnings(Array.from(householdWarnings));
    const skippedMsg = skipped.length > 0 ? ` (${skipped.length} skipped)` : '';
    const unknownMsg = unknownEvents.size > 0 ? `, ${unknownEvents.size} unknown event name${unknownEvents.size === 1 ? '' : 's'}` : '';
    const dupMsg = duplicateNames.length > 0 ? `, ${duplicateNames.length} duplicate name${duplicateNames.length === 1 ? '' : 's'} flagged` : '';
    const householdMsg = householdWarnings.size > 0 ? `, ${householdWarnings.size} household merge warning${householdWarnings.size === 1 ? '' : 's'}` : '';
    toast(`${parsed.length} guest${parsed.length !== 1 ? 's' : ''} ready to import${skippedMsg}${unknownMsg}${dupMsg}${householdMsg}.`, 'success');
  }, [isDemoMode, itineraryEvents, supabase, user?.id, weddingSiteId, toast]);

  const importCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role is read-only for guest imports.', 'info');
      e.target.value = '';
      return;
    }

    const file = e.target.files?.[0];
    if (!file) {
      toast('Please choose a CSV or Excel file to import.', 'error');
      return;
    }
    setCsvSelectedFilename(file.name);
    toast(`Parsing ${file.name}…`, 'success');

    try {
      const lowerName = file.name.toLowerCase();
      let rows: string[][] = [];

      if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          toast('Spreadsheet has no sheets to import.', 'error');
          return;
        }
        const firstSheet = workbook.Sheets[firstSheetName];
        rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as string[][];
      } else {
        const text = await file.text();
        rows = text
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean)
          .map(l => l.split(',').map(v => v.replace(/"/g, '').trim()));
      }

      if (rows.length < 2) {
        setCsvUnknownEvents([]);
        setCsvDuplicateNames([]);
        toast('File appears to be empty or missing a header row.', 'error');
        return;
      }

      const headers = (rows[0] || []).map((h) => String(h ?? '').trim().toLowerCase());

      const findIdx = (...candidates: string[]) => {
        for (const c of candidates) {
          const i = headers.indexOf(c);
          if (i >= 0) return i;
        }
        for (const c of candidates) {
          const i = headers.findIndex((h) => h.includes(c));
          if (i >= 0) return i;
        }
        return -1;
      };

      const defaultMap: CsvFieldMap = {
        first_name: findIdx('first name', 'first_name', 'firstname', 'given name', 'given_name', 'first'),
        last_name: findIdx('last name', 'last_name', 'lastname', 'surname', 'family_name', 'family name', 'last'),
        full_name: findIdx('name', 'full name', 'full_name', 'guest_name', 'guest name'),
        email: findIdx('email', 'email address', 'email_address', 'e mail', 'primary email', 'guest email', 'mail'),
        phone: findIdx('phone', 'phone number', 'phone_number', 'mobile', 'mobile number', 'cell', 'telephone', 'guest phone'),
        plus_one: findIdx('plus one', 'plus_one', 'plus_one_allowed', 'plus one allowed'),
        status: findIdx('status', 'rsvp_status', 'rsvp status', 'rsvp'),
        meal_choice: findIdx('meal choice', 'meal_choice', 'meal', 'meal option', 'meal selection'),
        rsvp_date: findIdx('rsvp date', 'rsvp_date', 'responded_at', 'response date', 'responded', 'submitted at'),
        invite_token: findIdx('invite token', 'invite_token', 'token', 'invite code'),
        household_id: findIdx('household_id', 'household id', 'household key', 'family_id', 'party_id', 'group id'),
        household_name: findIdx('household_name', 'household name', 'household', 'family', 'family name', 'group_name', 'group', 'group name', 'household group', 'party name'),
        invited_events: (() => {
          const i = findIdx('invited_events', 'invited events', 'events', 'event_invites', 'event invites list');
          return i >= 0 ? [i] : [];
        })(),
      };

      const filteredRows = rows.slice(1).filter((r) => r.some((v) => String(v ?? '').trim().length > 0));
      const samples = headers.map((_, idx) => {
        for (const row of filteredRows) {
          const sample = String(row?.[idx] ?? '').trim();
          if (sample.length > 0) return sample;
        }
        return '';
      });

      setCsvHeaders(headers);
      setCsvDataRows(filteredRows);
      setCsvColumnSamples(samples);
      setCsvFieldMap(defaultMap);
      setCsvShowMapper(true);
    } catch (err) {
      setCsvUnknownEvents([]);
      setCsvDuplicateNames([]);
      const msg = err instanceof Error ? err.message : 'Failed to parse guest file';
      toast(msg, 'error');
    } finally {
      e.target.value = '';
    }
  };

  const confirmCsvImport = async () => {
    if (!csvPreview) return;
    setCsvImporting(true);
    try {
      let resolvedSiteId = weddingSiteId;
      if (!resolvedSiteId && !isDemoMode) {
        const activeSite = user?.id ? await resolveActiveSiteForUser(user.id) : null;
        resolvedSiteId = activeSite?.id ?? null;
        if (resolvedSiteId) setWeddingSiteId(resolvedSiteId);
      }
      if (!resolvedSiteId && !isDemoMode) {
        toast('Could not find your wedding site. Refresh and try again.', 'error');
        return;
      }
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
          household_id: (g.__household_key as string | null) || null,
          group_name: (g.group_name as string | null) || null,
        } as GuestWithRSVP));

        setGuests(prev => [...importedGuests, ...prev]);
        setCsvImportSummary({ imported: csvPreview?.length ?? 0, skipped: csvSkipped.length, unknownEvents: 0, duplicateNames: csvDuplicateNames.length, guardedHouseholds: 0, householdKeys: 0 });
        const skippedMsg = csvSkipped.length > 0 ? `, ${csvSkipped.length} skipped` : '';
        toast(`${csvPreview.length} guest${csvPreview.length !== 1 ? 's' : ''} imported${skippedMsg}`, 'success');
        setCsvPreview(null);
        if (fromQuickStart && nextStep === 'photos') {
          navigate(buildQuickStartPhotosPath());
          return;
        }
        setCsvSkipped([]);
        setCsvUnknownEvents([]);
        setCsvDuplicateNames([]);
        setCsvHouseholdWarnings([]);
        setCsvSelectedFilename(null);
        setCsvMappingSummary({ core: [], rsvp: [], household: [], eventCols: [], weak: [] });
        return;
      }

      const guestsWithTokens: Array<Record<string, unknown>> = await Promise.all(
        csvPreview.map(async g => {
          const existingToken = (g.invite_token as string | null | undefined) ?? null;
          return {
            ...g,
            invite_token: existingToken && existingToken.length > 0 ? existingToken : await generateSecureToken(),
          };
        })
      );

      const guestRows = guestsWithTokens.map((g) => {
        const row = { ...g } as Record<string, unknown>;
        delete row.__household_key;
        delete row.__invited_event_ids;
        delete row.__meal_choice;
        delete row.__rsvp_date;
        return row;
      });

      const { data: insertedGuests, error } = await supabase
        .from('guests')
        .insert(guestRows)
        .select('id, first_name, last_name, name, email');
      if (error) throw error;

      const inserted = insertedGuests ?? [];
      const keyToGuestIds = new Map<string, string[]>();
      const householdLastNames = new Map<string, Set<string>>();
      guestsWithTokens.forEach((row, idx) => {
        const key = row.__household_key as string | null | undefined;
        if (!key) return;
        const guestId = inserted[idx]?.id as string | undefined;
        if (!guestId) return;
        const existing = keyToGuestIds.get(key) ?? [];
        existing.push(guestId);
        keyToGuestIds.set(key, existing);
        const lastNames = householdLastNames.get(key) ?? new Set();
        const lastName = String(row.last_name || '').trim().toLowerCase();
        if (lastName) lastNames.add(lastName);
        householdLastNames.set(key, lastNames);
      });

      let guardedHouseholds = 0;
      for (const [key, ids] of keyToGuestIds) {
        if (ids.length < 2) continue;
        const lastNames = householdLastNames.get(key) ?? new Set();
        if (key.startsWith('name:') && lastNames.size > 1) {
          guardedHouseholds += 1;
          continue;
        }
        const householdId = ids[0];
        const { error: householdUpdateError } = await supabase
          .from('guests')
          .update({ household_id: householdId })
          .in('id', ids);
        if (householdUpdateError) throw householdUpdateError;
      }

      const eventInviteRows: Array<{ event_id: string; guest_id: string }> = [];
      const rsvpRows: Array<{ guest_id: string; attending: boolean; meal_choice: string | null; responded_at: string | null }> = [];
      guestsWithTokens.forEach((row, idx) => {
        const guestId = inserted[idx]?.id as string | undefined;
        if (!guestId) return;
        const eventIds = (row.__invited_event_ids as string[] | undefined) ?? [];
        eventIds.forEach((eventId) => eventInviteRows.push({ event_id: eventId, guest_id: guestId }));

        const status = String(row.rsvp_status || 'pending').toLowerCase();
        const attending = isAttendingRsvpStatus(status);
        const declined = isDeclinedRsvpStatus(status) || status === 'no';
        if (attending || declined) {
          rsvpRows.push({
            guest_id: guestId,
            attending,
            meal_choice: (row.__meal_choice as string | null | undefined) ?? null,
            responded_at: (row.__rsvp_date as string | null | undefined)
              || (row.rsvp_received_at as string | null | undefined)
              || new Date().toISOString(),
          });
        }
      });

      if (eventInviteRows.length > 0) {
        const { error: inviteError } = await supabase.from('event_invitations').insert(eventInviteRows);
        if (inviteError) throw inviteError;
      }

      if (rsvpRows.length > 0) {
        const rsvpGuestIds = Array.from(new Set(rsvpRows.map((r) => r.guest_id)));
        const { error: rsvpDeleteError } = await supabase.from('rsvps').delete().in('guest_id', rsvpGuestIds);
        if (rsvpDeleteError) throw rsvpDeleteError;

        const { error: rsvpInsertError } = await supabase.from('rsvps').insert(rsvpRows);
        if (rsvpInsertError) throw rsvpInsertError;
      }

      await fetchGuests();
      setCsvImportSummary({ imported: csvPreview?.length ?? 0, skipped: csvSkipped.length, unknownEvents: csvUnknownEvents.length, duplicateNames: csvDuplicateNames.length, guardedHouseholds: 0, householdKeys: 0 });
      const skippedMsg = csvSkipped.length > 0 ? `, ${csvSkipped.length} skipped` : '';
      const householdsMsg = keyToGuestIds.size > 0 ? `, ${keyToGuestIds.size} household key${keyToGuestIds.size === 1 ? '' : 's'}` : '';
      const guardedMsg = guardedHouseholds > 0 ? `, ${guardedHouseholds} risky household merge${guardedHouseholds === 1 ? '' : 's'} skipped` : '';
      const eventsMsg = eventInviteRows.length > 0 ? `, ${eventInviteRows.length} event invite${eventInviteRows.length === 1 ? '' : 's'}` : '';
      const unknownEventsMsg = csvUnknownEvents.length > 0 ? `, ${csvUnknownEvents.length} unknown event name${csvUnknownEvents.length === 1 ? '' : 's'}` : '';
      toast(`${csvPreview.length} guest${csvPreview.length !== 1 ? 's' : ''} imported${skippedMsg}${householdsMsg}${guardedMsg}${eventsMsg}${unknownEventsMsg}`, 'success');
      setCsvPreview(null);
      if (fromQuickStart && nextStep === 'photos') {
        navigate(buildQuickStartPhotosPath());
        return;
      }
      setCsvSkipped([]);
      setCsvUnknownEvents([]);
      setCsvDuplicateNames([]);
      setCsvHouseholdWarnings([]);
      setCsvSelectedFilename(null);
      setCsvMappingSummary({ core: [], rsvp: [], household: [], eventCols: [], weak: [] });
    } catch (err) {
      const errObj = err as { message?: string; details?: string; hint?: string; code?: string } | null;
      const msg = errObj?.message || errObj?.details || errObj?.hint || (err instanceof Error ? err.message : 'Unknown error');
      const code = errObj?.code ? ` (${errObj.code})` : '';
      toast(`Import failed: ${msg}${code}`, 'error');
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
    const checkFilter = (filter: string) => {
      if (filter.startsWith('event-invited:')) {
        const eventId = filter.replace('event-invited:', '');
        if (eventId === 'legacy-ceremony') return guest.invited_to_ceremony;
        if (eventId === 'legacy-reception') return guest.invited_to_reception;
        return eventInviteGuestMap.get(eventId)?.has(guest.id) ?? false;
      }
      if (filter.startsWith('event-not-invited:')) {
        const eventId = filter.replace('event-not-invited:', '');
        if (eventId === 'legacy-ceremony') return !guest.invited_to_ceremony;
        if (eventId === 'legacy-reception') return !guest.invited_to_reception;
        return !(eventInviteGuestMap.get(eventId)?.has(guest.id) ?? false);
      }

      return (
        filter === 'all' ||
        guest.rsvp_status === filter ||
        (filter === 'ceremony-no' && eventSelections?.ceremony === false) ||
        (filter === 'reception-no' && eventSelections?.reception === false) ||
        (filter === 'missing-meal' && !!guest.rsvp?.attending && !guest.rsvp?.meal_choice) ||
        (filter === 'plusone-missing' && !!guest.plus_one_allowed && !!guest.rsvp?.attending && !guest.rsvp?.plus_one_name) ||
        (filter === 'pending-no-email' && isPendingRsvpStatus(guest.rsvp_status) && !guest.email) ||
        (filter === 'no-contact' && !guest.email && !guest.phone) ||
        (filter === 'missing-address' && !(guest as GuestWithRSVP & { mailing_address_line1?: string | null }).mailing_address_line1) ||
        (filter === 'due-reminder' && isDueReminder(guest)) ||
        (filter === 'checked-in' && !!(guest as GuestWithRSVP & { checked_in_at?: string | null }).checked_in_at) ||
        (filter === 'thank-you-due' && dueThankYouGuestIds.has(guest.id))
      );
    };

    const matchesPrimaryFilter = checkFilter(filterStatus);
    const matchesExtraFilters = extraFilters.every((f) => checkFilter(f));

    return matchesSearch && matchesPrimaryFilter && matchesExtraFilters;
  });

  const emailableFilteredGuests = filteredGuests.filter(g => !!g.email && !!g.invite_token);
  const filteredGuestUpdateRecipients = filteredGuests
    .filter((guest) => !!guest.invite_token)
    .map((guest) => ({
      name: guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.name,
      inviteToken: guest.invite_token!,
    }));


  const daysToWedding = getDaysUntilGuestWedding(weddingSiteInfo?.wedding_date);


  const issueCountForGuest = (guest: GuestWithRSVP) => {
    let issues = 0;
    const ev = parseRsvpEventSelections(guest.rsvp?.notes ?? null);
    if (isPendingRsvpStatus(guest.rsvp_status)) issues += 1;
    if (guest.rsvp?.attending && !guest.rsvp?.meal_choice) issues += 1;
    if (guest.plus_one_allowed && guest.rsvp?.attending && !guest.rsvp?.plus_one_name) issues += 1;
    if (isPendingRsvpStatus(guest.rsvp_status) && !guest.email && !guest.phone) issues += 1;
    if (ev?.ceremony === false || ev?.reception === false) issues += 1;
    return issues;
  };

  const priorityScore = (guest: GuestWithRSVP) => {
    let score = 0;
    const ev = parseRsvpEventSelections(guest.rsvp?.notes ?? null);
    if (isPendingRsvpStatus(guest.rsvp_status)) score += 100;
    if (guest.rsvp?.attending && !guest.rsvp?.meal_choice) score += 60;
    if (guest.plus_one_allowed && guest.rsvp?.attending && !guest.rsvp?.plus_one_name) score += 40;
    if (ev?.ceremony === false || ev?.reception === false) score += 15;
    if (isPendingRsvpStatus(guest.rsvp_status) && !guest.email) score += 20;
    if (daysToWedding !== null && daysToWedding <= 30) score += 15;
    return score;
  };

  const compareGuestsByLastName = (a: GuestWithRSVP, b: GuestWithRSVP) => {
    const aLast = (a.last_name || '').trim().toLowerCase();
    const bLast = (b.last_name || '').trim().toLowerCase();
    if (aLast !== bLast) return aLast.localeCompare(bLast);

    const aFirst = (a.first_name || '').trim().toLowerCase();
    const bFirst = (b.first_name || '').trim().toLowerCase();
    if (aFirst !== bFirst) return aFirst.localeCompare(bFirst);

    const aName = (a.name || '').trim().toLowerCase();
    const bName = (b.name || '').trim().toLowerCase();
    return aName.localeCompare(bName);
  };

  const displayedGuestsBase = sortByPriority
    ? [...filteredGuests].sort((a, b) => {
      const scoreDelta = priorityScore(b) - priorityScore(a);
      if (scoreDelta !== 0) return scoreDelta;
      return compareGuestsByLastName(a, b);
    })
    : [...filteredGuests].sort(compareGuestsByLastName);

  const displayedGuests = checkInMode
    ? [...displayedGuestsBase].sort((a, b) => {
      const aChecked = !!(a as GuestWithRSVP & { checked_in_at?: string | null }).checked_in_at;
      const bChecked = !!(b as GuestWithRSVP & { checked_in_at?: string | null }).checked_in_at;
      if (aChecked !== bChecked) return aChecked ? 1 : -1;
      return compareGuestsByLastName(a, b);
    })
    : displayedGuestsBase;


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
    confirmed: guests.filter(g => isAttendingRsvpStatus(g.rsvp_status)).length,
    declined: guests.filter(g => isDeclinedRsvpStatus(g.rsvp_status)).length,
    pending: guests.filter(g => isPendingRsvpStatus(g.rsvp_status)).length,
    rsvpRate: guests.length > 0 ? Math.round(((guests.filter(g => hasRespondedRsvpStatus(g.rsvp_status)).length) / guests.length) * 100) : 0,
  };

  const plannerHandoff = getPlannerHandoffCopy(guestsRole, 'guests');

  const eventReport = effectiveItineraryEvents.map((event) => {
    const invitedGuests = guests.filter((guest) => {
      if (event.id === 'legacy-ceremony') return guest.invited_to_ceremony;
      if (event.id === 'legacy-reception') return guest.invited_to_reception;
      return eventInviteGuestMap.get(event.id)?.has(guest.id) ?? false;
    });

    const attendingCount = invitedGuests.filter((guest) => {
      const eventSelections = parseRsvpEventSelections(guest.rsvp?.notes ?? null);
      if (event.id === 'legacy-ceremony') return eventSelections?.ceremony === true;
      if (event.id === 'legacy-reception') return eventSelections?.reception === true;
      return false;
    }).length;

    const declinedCount = invitedGuests.filter((guest) => {
      const eventSelections = parseRsvpEventSelections(guest.rsvp?.notes ?? null);
      if (event.id === 'legacy-ceremony') return eventSelections?.ceremony === false;
      if (event.id === 'legacy-reception') return eventSelections?.reception === false;
      return false;
    }).length;

    return {
      id: event.id,
      name: event.event_name,
      invited: invitedGuests.length,
      attending: attendingCount,
      declined: declinedCount,
      pending: Math.max(invitedGuests.length - attendingCount - declinedCount, 0),
    };
  });

  const mealChoiceRollup = Array.from(
    guests.reduce((map, guest) => {
      const key = (guest.rsvp?.meal_choice || 'No meal selected').trim();
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1]);

  const customAnswerRollup = Array.from(
    guests.reduce((map, guest) => {
      const answers = guest.rsvp?.custom_answers || {};
      Object.entries(answers).forEach(([question, value]) => {
        const values = Array.isArray(value) ? value : [value];
        values
          .map((entry) => String(entry ?? '').trim())
          .filter(Boolean)
          .forEach((entry) => {
            const key = `${question}::${entry}`;
            map.set(key, (map.get(key) || 0) + 1);
          });
      });
      return map;
    }, new Map<string, number>())
  )
    .map(([key, count]) => {
      const [question, answer] = key.split('::');
      return { question, answer, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const songRequestEntries = guests
    .flatMap((guest) => {
      const answers = guest.rsvp?.custom_answers || {};
      return Object.entries(answers)
        .filter(([question]) => /song|playlist|dance/i.test(question))
        .flatMap(([question, value]) => {
          const values = Array.isArray(value) ? value : [value];
          return values
            .map((entry) => String(entry ?? '').trim())
            .filter(Boolean)
            .map((entry) => ({
              guestName: guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.name,
              question,
              answer: entry,
            }));
        });
    })
    .slice(0, 12);


  const contactStats = {
    withEmail: guests.filter(g => !!g.email).length,
    withPhone: guests.filter(g => !!g.phone).length,
    withNoContact: guests.filter(g => !g.email && !g.phone).length,
    contactCoverage: guests.length > 0
      ? Math.round((guests.filter(g => !!g.email || !!g.phone).length / guests.length) * 100)
      : 0,
  };

  const fallbackByGuest = new Map(filteredGuests.map((guest) => [guest.id, getRsvpFallbackState({
    rsvpStatus: guest.rsvp_status,
    hasEmail: Boolean(guest.email),
    hasPhone: Boolean(guest.phone),
    manualHandled: typeof guest.notes === 'string' && guest.notes.toLowerCase().includes('[manual rsvp]'),
  })]));


  const householdStateByGuest = new Map(filteredGuests.map((guest) => {
    const householdMembers = guest.household_id ? filteredGuests.filter((member) => member.household_id === guest.household_id) : [];
    const mixedResponses = householdMembers.length > 1 && new Set(householdMembers.map((member) => member.rsvp_status)).size > 1;
    const unnamedPlusOne = Boolean(guest.plus_one_allowed && guest.rsvp?.attending && !guest.rsvp?.plus_one_name);
    const state = mixedResponses
      ? 'Mixed household responses'
      : unnamedPlusOne
        ? 'Plus-one unresolved'
        : householdMembers.length > 1
          ? 'Grouped household'
          : 'Standalone guest';
    return [guest.id, state] as const;
  }));


  const mealSummary = {
    withMealChoice: filteredGuests.filter((guest) => Boolean(guest.rsvp?.meal_choice)).length,
    missingMealChoice: filteredGuests.filter((guest) => isAttendingRsvpStatus(guest.rsvp_status) && !guest.rsvp?.meal_choice).length,
    withDietaryNote: filteredGuests.filter((guest) => Boolean(extractDietaryNote(guest.rsvp?.custom_answers as Record<string, unknown> | null | undefined, guest.notes))).length,
  };


  const exceptionStateByGuest = new Map(filteredGuests.map((guest) => {
    const householdStatuses = guest.household_id ? filteredGuests.filter((member) => member.household_id === guest.household_id).map((member) => member.rsvp_status) : [];
    const states = getRsvpExceptionStates({
      householdStatuses,
      plusOneAllowed: guest.plus_one_allowed,
      plusOneName: guest.rsvp?.plus_one_name,
      attending: guest.rsvp?.attending,
      mealChoice: guest.rsvp?.meal_choice,
      manualHandled: typeof guest.notes === 'string' && guest.notes.toLowerCase().includes('[manual rsvp]'),
    });
    return [guest.id, states] as const;
  }));

  const rsvpOps = {
    missingMeal: guests.filter(g => g.rsvp?.attending && !g.rsvp?.meal_choice).length,
    plusOneMissingName: guests.filter(g => g.plus_one_allowed && g.rsvp?.attending && !g.rsvp?.plus_one_name).length,
    ceremonyNo: guests.filter(g => parseRsvpEventSelections(g.rsvp?.notes ?? null)?.ceremony === false).length,
    receptionNo: guests.filter(g => parseRsvpEventSelections(g.rsvp?.notes ?? null)?.reception === false).length,
    noResponse: guests.filter(g => isPendingRsvpStatus(g.rsvp_status)).length,
    pendingNoEmail: guests.filter(g => isPendingRsvpStatus(g.rsvp_status) && !g.email).length,
  };

  const manualFollowUpCount = guests.filter((guest) => getRsvpFallbackState({
    rsvpStatus: guest.rsvp_status,
    hasEmail: Boolean(guest.email),
    hasPhone: Boolean(guest.phone),
    manualHandled: typeof guest.notes === 'string' && guest.notes.toLowerCase().includes('[manual rsvp]'),
  }).state === 'manual-follow-up').length;

  const manualHandledCount = guests.filter((guest) => getRsvpFallbackState({
    rsvpStatus: guest.rsvp_status,
    hasEmail: Boolean(guest.email),
    hasPhone: Boolean(guest.phone),
    manualHandled: typeof guest.notes === 'string' && guest.notes.toLowerCase().includes('[manual rsvp]'),
  }).state === 'manual-handled').length;

  const guestOpsCoach = buildGuestOpsCoach({
    totalGuests: guests.length,
    attendingGuests: guests.filter((guest) => isAttendingRsvpStatus(guest.rsvp_status)).length,
    pendingResponses: rsvpOps.noResponse,
    pendingWithoutEmail: rsvpOps.pendingNoEmail,
    noContact: contactStats.withNoContact,
    missingMealChoices: rsvpOps.missingMeal,
    missingPlusOneNames: rsvpOps.plusOneMissingName,
    manualFollowUp: manualFollowUpCount,
    manualHandled: manualHandledCount,
  });
  const guestOutreachSequence = buildGuestOutreachSequence({
    totalGuests: guests.length,
    attendingGuests: guests.filter((guest) => isAttendingRsvpStatus(guest.rsvp_status)).length,
    pendingResponses: rsvpOps.noResponse,
    pendingWithoutEmail: rsvpOps.pendingNoEmail,
    noContact: contactStats.withNoContact,
    missingMealChoices: rsvpOps.missingMeal,
    missingPlusOneNames: rsvpOps.plusOneMissingName,
    manualFollowUp: manualFollowUpCount,
    manualHandled: manualHandledCount,
  }, {
    scheduledCount: campaignLog.length,
    overdueScheduledCount: 0,
    partialCount: 0,
    failedCount: 0,
    unreachedRecipientCount: contactStats.withNoContact,
  });

  const recommendedAction = guestOpsCoach.primaryAction
    ? {
        filter: guestOpsCoach.primaryAction.filter as typeof filterStatus,
        title: guestOpsCoach.primaryAction.title,
        detail: guestOpsCoach.primaryAction.detail,
      }
    : null;

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

    if (isPendingRsvpStatus(g.rsvp_status)) {
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
    'checked-in': 'Checked In',
    'thank-you-due': 'Thank You Due',
    'due-reminder': 'Due Reminder',
    'missing-address': 'Missing Address',
    'ceremony-no': 'Ceremony: No',
    'reception-no': 'Reception: No',
    'missing-meal': 'Missing Meal',
    'plusone-missing': 'Plus-one Missing Name',
    'pending-no-email': 'Pending, No Email',
    'manual-follow-up': 'Manual Follow-up',
    'manual-handled': 'Handled Manually',
    'no-contact': 'No Contact Info',
  };

  const labelForFilter = (filter: string) => {
    if (segmentLabelMap[filter]) return segmentLabelMap[filter];
    if (filter.startsWith('event-invited:')) {
      const eventId = filter.replace('event-invited:', '');
      const name = effectiveItineraryEvents.find((e) => e.id === eventId)?.event_name ?? 'Event';
      return `${name}: Invited`;
    }
    if (filter.startsWith('event-not-invited:')) {
      const eventId = filter.replace('event-not-invited:', '');
      const name = effectiveItineraryEvents.find((e) => e.id === eventId)?.event_name ?? 'Event';
      return `${name}: Not invited`;
    }
    return filter;
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

  const renderGuestFormModal = ({ onSubmit, onClose, title, submitLabel }: { onSubmit: (e: React.FormEvent) => void; onClose: () => void; title: string; submitLabel: string }) => (
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
                  onChange={(e) => setFormData({ ...formData, plus_one_allowed: e.target.checked, require_plus_one_name: e.target.checked ? formData.require_plus_one_name : false })}
                  className="rounded"
                />
                <span className="text-sm text-text-primary">Allow Plus One</span>
              </label>

              {formData.plus_one_allowed && (
                <label className="flex items-center gap-2 pl-6">
                  <input
                    type="checkbox"
                    checked={formData.require_plus_one_name}
                    onChange={(e) => setFormData({ ...formData, require_plus_one_name: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-text-primary">Require plus-one name</span>
                </label>
              )}

              {effectiveItineraryEvents.length > 0 && (
                <div className="pt-1 border-t border-border-subtle">
                  <p className="text-xs font-medium text-text-secondary mb-2">Itinerary invitations</p>
                  {itineraryFilterEvents.length === 0 && (
                    <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-subtle/30 px-3 py-2">
                      <p className="text-[11px] text-text-tertiary">No itinerary events yet — using Ceremony/Reception defaults for now.</p>
                      <button
                        type="button"
                        onClick={() => navigate('/dashboard/itinerary#itinerary-readiness')}
                        className="rounded border border-border px-2.5 py-1 text-[11px] text-text-secondary hover:border-primary/40 hover:text-primary"
                      >
                        Open itinerary
                      </button>
                    </div>
                  )}
                  <div className="space-y-1.5 max-h-40 overflow-auto pr-1">
                    {effectiveItineraryEvents.map((event) => {
                      const checked = formEventInviteIds.has(event.id);
                      return (
                        <label key={event.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = new Set(formEventInviteIds);
                              if (e.target.checked) next.add(event.id);
                              else next.delete(event.id);
                              setFormEventInviteIds(next);
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-text-primary truncate">{event.event_name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" fullWidth onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" fullWidth>
                {submitLabel}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );

  const [skipRecentlyInvited, setSkipRecentlyInvited] = useState(true);
  const [reminderCadenceDays, setReminderCadenceDays] = useState<1 | 3 | 7>(3);
  const [autoRemindersEnabled, setAutoRemindersEnabled] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showOpsMenu, setShowOpsMenu] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showNuclearDeleteModal, setShowNuclearDeleteModal] = useState(false);
  const [nuclearConfirmInput, setNuclearConfirmInput] = useState('');
  const [nuclearDeleting, setNuclearDeleting] = useState(false);

  const reminderCadenceMs = reminderCadenceDays * 24 * 60 * 60 * 1000;
  const isDueReminder = (g: GuestWithRSVP) => {
    const guest = g as GuestWithRSVP & { reminder_last_sent_at?: string | null; invitation_sent_at?: string | null };
    if (!guest.email || !isPendingRsvpStatus(guest.rsvp_status)) return false;
    const lastSentRaw = guest.reminder_last_sent_at || guest.invitation_sent_at;
    const lastSent = lastSentRaw ? new Date(lastSentRaw) : null;
    if (!lastSent || Number.isNaN(lastSent.getTime())) return true;
    return (Date.now() - lastSent.getTime()) >= reminderCadenceMs;
  };

  const dueReminderGuestIds = new Set(guests.filter(isDueReminder).map((g) => g.id));

  const dueThankYouGuestIds = new Set(
    guests
      .filter((g) => {
        const guest = g as GuestWithRSVP & { thank_you_sent_at?: string | null };
        return isAttendingRsvpStatus(g.rsvp_status) && !guest.thank_you_sent_at;
      })
      .map((g) => g.id)
  );

  const dueReminderCandidatesGlobal = guests.filter((g) => !!g.email && !!g.invite_token && isDueReminder(g));

  const reminderCandidates = emailableFilteredGuests.filter((g: any) => {
    if (!skipRecentlyInvited) return true;
    return dueReminderGuestIds.has(g.id);
  });
  const smsRsvpLinkCandidates = getSmsRsvpLinkCandidates(filteredGuests, {
    skipRecentlyInvited,
    reminderCadenceMs,
  });

  const dryRunRecipientPreview = reminderCandidates.slice(0, 8).map((g) => (g.first_name || g.last_name) ? `${g.first_name ?? ""} ${g.last_name ?? ""}`.trim() : g.name);


  if (loading) {
    return (
      <DashboardLayout currentPage="guests">
        <div className="max-w-7xl mx-auto">
          <DashboardStateBlock title="Loading guests…" description="Preparing your guest list and RSVP status." />
        </div>
      </DashboardLayout>
    );
  }

  if (guestsTab === 'rsvp-config') {
    return (
      <DashboardLayout currentPage="guests">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Guests & RSVP</h1>
            <p className="text-text-secondary">Manage your guest list and see responses</p>
            <a href="/dashboard/rsvp-board" className="text-xs text-primary hover:text-primary-hover">Open RSVP view</a>
            <div className="mt-4 inline-flex rounded-lg border border-border-subtle bg-surface-subtle p-1">
              <button className="px-3 py-1.5 text-sm rounded-md text-text-secondary" onClick={() => setGuestsTab('ops')}>Guest Ops</button>
              <button className="px-3 py-1.5 text-sm rounded-md bg-white text-text-primary shadow-sm" onClick={() => setGuestsTab('rsvp-config')}>RSVP Config</button>
            </div>
          </div>

          <Card variant="bordered" padding="lg">
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">RSVP Questions & Meal Choices</h3>
                          <p className="text-sm text-text-secondary">Choose what guests answer when they reply on the RSVP page.</p>
              </div>

              <div className="space-y-3 p-4 border border-border rounded-xl">
                <label className="flex items-center gap-2 text-sm text-text-primary">
                  <input type="checkbox" checked={rsvpMealEnabled} onChange={(e) => { setRsvpMealEnabled(e.target.checked); setRsvpConfigDirty(true); }} className="w-4 h-4" />
                  Collect meal choice on the RSVP form
                </label>
                {rsvpMealEnabled && (
                  <div className="space-y-2">
                    {rsvpMealOptions.map((opt, idx) => (
                      <div key={`meal-${idx}`} className="flex items-center gap-2">
                        <Input value={opt} onChange={(e) => setRsvpMealOptions((prev) => { const n=[...prev]; n[idx]=toTitleCase(e.target.value); return n; })} placeholder={`Meal option ${idx+1}`} />
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setRsvpMealOptions((prev) => prev.filter((_, i) => i !== idx)); setRsvpConfigDirty(true); }}>Remove</Button>
                      </div>
                    ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => { setRsvpMealOptions((prev) => [...prev, '']); setRsvpConfigDirty(true); }}>Add meal choice</Button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {rsvpQuestions.map((q, idx) => (
                  <div key={q.id} className="p-4 border border-border rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Question {idx + 1}</p>
                      <button
                        type="button"
                        aria-label="Delete question"
                        title="Delete question"
                        className="p-1.5 rounded-md text-text-tertiary hover:text-error hover:bg-error-light"
                        onClick={() => {
                          if (!window.confirm('Delete this question?')) return;
                          setRsvpQuestions((prev) => prev.filter((x) => x.id !== q.id));
                          setRsvpConfigDirty(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                  <Button type="button" variant="outline" onClick={() => { setRsvpQuestions((prev) => [...prev, makeRsvpQuestion()]); setRsvpConfigDirty(true); }}>Add question</Button>
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="primary" onClick={handleSaveRsvpConfig} disabled={rsvpConfigSaving}>{rsvpConfigSaving ? 'Saving…' : 'Save Now'}</Button>
                    <span className="text-xs text-text-tertiary">{rsvpAutoSaveState === 'saving' ? 'Auto-saving…' : rsvpAutoSaveState === 'saved' ? 'Auto-saved' : rsvpAutoSaveState === 'error' ? 'Auto-save failed' : 'Auto-save on'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card variant="bordered" padding="lg">
            <details className="group" open>
              <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">Guest change history</h3>
                  <p className="text-sm text-text-secondary">Recent guest updates so you can track what changed without leaving RSVP config.</p>
                </div>
                <span className="text-xs text-text-tertiary">{rsvpAuditFeed.length} recent</span>
              </summary>

              <div className="mt-4 space-y-2">
                {rsvpAuditLoading ? (
                  <div className="text-sm text-text-secondary">Loading history…</div>
                ) : rsvpAuditFeed.length === 0 ? (
                  <div className="text-sm text-text-secondary">No recent guest changes yet.</div>
                ) : (
                  rsvpAuditFeed.slice(0, 8).map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-border-subtle bg-surface-subtle/40 px-3 py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {(() => {
                              const ActionIcon = getAuditActionIcon(entry.action);
                              return (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border ${getAuditActionTone(entry.action)}`}>
                                  <ActionIcon className="w-3 h-3" />
                                  <span>{entry.action === 'insert' ? 'Created' : entry.action === 'delete' ? 'Removed' : 'Updated'}</span>
                                </span>
                              );
                            })()}
                            <span className="text-xs text-text-tertiary truncate">{getAuditGuestLabel(entry)}</span>
                          </div>
                          <p className="text-sm text-text-secondary leading-relaxed">{summarizeAuditEntry(entry)}</p>
                        </div>
                        <span className="text-xs text-text-tertiary whitespace-nowrap">{formatGuestOpsRelativeTime(entry.changed_at)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </details>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const canEditGuests = !isGuestsReadOnly;

  return (
    <DashboardLayout currentPage="guests">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Guests & RSVP</h1>
          <p className="text-text-secondary">Manage your guest list and see responses</p>
          <a href="/dashboard/rsvp-board" className="text-xs text-primary hover:text-primary-hover">Open RSVP Board</a>
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <div className="inline-flex rounded-lg border border-border-subtle bg-surface-subtle p-1">
              <button className="px-3 py-1.5 text-sm rounded-md bg-white text-text-primary shadow-sm" onClick={() => setGuestsTab('ops')}>Guests</button>
              <button className="px-3 py-1.5 text-sm rounded-md text-text-secondary" onClick={() => setGuestsTab('rsvp-config')}>RSVP Settings</button>
            </div>
            <button
              onClick={() => setShowInsights(v => !v)}
              className="px-3 py-1.5 text-xs rounded-md border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary"
            >
              {showInsights ? 'Hide insights' : 'Show insights'}
            </button>
          </div>
        </div>

        {csvImportSummary && (
          <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-3 py-3 text-sm space-y-2">
            <p className="font-medium text-text-primary">Last import summary</p>
            <p className="text-text-secondary">Imported {csvImportSummary.imported} guest{csvImportSummary.imported === 1 ? '' : 's'} · skipped {csvImportSummary.skipped} · household keys {csvImportSummary.householdKeys} · risky merges skipped {csvImportSummary.guardedHouseholds} · unknown events {csvImportSummary.unknownEvents} · duplicate names flagged {csvImportSummary.duplicateNames}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
                <p className="font-medium">What came through</p>
                <p className="mt-1">Guest rows imported, event links mapped where possible, and safer household grouping applied when the keys looked trustworthy.</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                <p className="font-medium">Still review</p>
                <p className="mt-1">Check skipped rows, duplicate names, risky household merges, unknown events, and any guests still missing direct contact info.</p>
              </div>
            </div>
          </div>
        )}

        {guestsRole !== 'owner' && (
          <PlannerHandoffCard
            tone={guestsRole === 'planner' ? 'planner' : guestsRole === 'coordinator' ? 'coordinator' : 'viewer'}
            handoff={plannerHandoff}
          />
        )}


        {!cleanGuestsView && (
        <details className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-3">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-text-primary">Snapshot & RSVP insights</span>
            <span className="text-xs text-text-tertiary">View details</span>
          </summary>
          <div className="mt-3 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card variant="bordered" padding="md">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-xl font-bold text-text-primary">{stats.total}</p>
                    <p className="text-xs text-text-secondary">Invited</p>
                  </div>
                </div>
              </Card>
              <Card variant="bordered" padding="md">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success" aria-hidden="true" />
                  <div>
                    <p className="text-xl font-bold text-text-primary">{stats.confirmed}</p>
                    <p className="text-xs text-text-secondary">RSVP Yes</p>
                  </div>
                </div>
              </Card>
              <Card variant="bordered" padding="md">
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-error" aria-hidden="true" />
                  <div>
                    <p className="text-xl font-bold text-text-primary">{stats.declined}</p>
                    <p className="text-xs text-text-secondary">RSVP No</p>
                  </div>
                </div>
              </Card>
              <Card variant="bordered" padding="md">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-warning" aria-hidden="true" />
                  <div>
                    <p className="text-xl font-bold text-text-primary">{stats.pending}</p>
                    <p className="text-xs text-text-secondary">Pending</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card variant="bordered" padding="md">
                <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Response rate</p>
                <p className="mt-1 text-xl font-bold text-text-primary">{stats.rsvpRate}%</p>
                <p className="mt-1 text-xs text-text-secondary">Guests who already replied</p>
              </Card>
              <Card variant="bordered" padding="md">
                <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Meal coverage</p>
                <p className="mt-1 text-xl font-bold text-text-primary">{mealSummary.withMealChoice}</p>
                <p className="mt-1 text-xs text-text-secondary">Guests with a meal choice saved</p>
              </Card>
              <Card variant="bordered" padding="md">
                <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Dietary notes</p>
                <p className="mt-1 text-xl font-bold text-text-primary">{mealSummary.withDietaryNote}</p>
                <p className="mt-1 text-xs text-text-secondary">Guests with dietary detail captured</p>
              </Card>
              <Card variant="bordered" padding="md">
                <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Contact coverage</p>
                <p className="mt-1 text-xl font-bold text-text-primary">{contactStats.contactCoverage}%</p>
                <p className="mt-1 text-xs text-text-secondary">Guests with email or phone on file</p>
              </Card>
            </div>

            {(eventReport.length > 0 || mealChoiceRollup.length > 0 || customAnswerRollup.length > 0) && (
              <div className="grid gap-3 lg:grid-cols-3">
                <Card variant="bordered" padding="md">
                  <p className="text-sm font-semibold text-text-primary">Event breakdown</p>
                  <div className="mt-3 space-y-2.5">
                    {eventReport.length === 0 ? (
                      <p className="text-sm text-text-secondary">No event-level reporting yet.</p>
                    ) : eventReport.map((event) => (
                      <div key={event.id} className="rounded-lg border border-border-subtle bg-white px-3 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-text-primary">{event.name}</p>
                          <span className="text-xs text-text-tertiary">Invited {event.invited}</span>
                        </div>
                        <p className="mt-1 text-xs text-text-secondary">Yes {event.attending} · No {event.declined} · Pending {event.pending}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card variant="bordered" padding="md">
                  <p className="text-sm font-semibold text-text-primary">Meal rollup</p>
                  <div className="mt-3 space-y-2.5">
                    {mealChoiceRollup.length === 0 ? (
                      <p className="text-sm text-text-secondary">No meal data yet.</p>
                    ) : mealChoiceRollup.slice(0, 6).map(([meal, count]) => (
                      <div key={meal} className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-white px-3 py-2.5">
                        <span className="text-sm text-text-primary">{meal}</span>
                        <span className="text-sm font-semibold text-text-primary">{count}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card variant="bordered" padding="md">
                  <p className="text-sm font-semibold text-text-primary">Top custom answers</p>
                  <div className="mt-3 space-y-2.5">
                    {customAnswerRollup.length === 0 ? (
                      <p className="text-sm text-text-secondary">No custom answers captured yet.</p>
                    ) : customAnswerRollup.map((entry, index) => (
                      <div key={`${entry.question}-${entry.answer}-${index}`} className="rounded-lg border border-border-subtle bg-white px-3 py-2.5">
                        <p className="text-xs uppercase tracking-wide text-text-tertiary">{entry.question}</p>
                        <div className="mt-1 flex items-center justify-between gap-3">
                          <span className="text-sm text-text-primary">{entry.answer}</span>
                          <span className="text-sm font-semibold text-text-primary">{entry.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card variant="bordered" padding="md">
                  <p className="text-sm font-semibold text-text-primary">Song requests</p>
                  <div className="mt-3 space-y-2.5">
                    {songRequestEntries.length === 0 ? (
                      <p className="text-sm text-text-secondary">No song requests captured yet.</p>
                    ) : songRequestEntries.map((entry, index) => (
                      <div key={`${entry.guestName}-${entry.answer}-${index}`} className="rounded-lg border border-border-subtle bg-white px-3 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-text-primary">{entry.answer}</p>
                          <span className="text-xs text-text-tertiary">{entry.guestName}</span>
                        </div>
                        <p className="mt-1 text-xs uppercase tracking-wide text-text-tertiary">{entry.question}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
              <button onClick={() => { setSearchQuery(''); setFilterStatus('missing-meal'); setViewMode('list'); }} className="text-left p-2.5 rounded-lg border border-border-subtle hover:border-primary/40 hover:bg-primary/5 transition-colors">
                <p className="text-xs text-text-tertiary">Missing meal</p>
                <p className="text-base font-semibold text-text-primary">{rsvpOps.missingMeal}</p>
              </button>
              <button onClick={() => { setSearchQuery(''); setFilterStatus('plusone-missing'); setViewMode('list'); }} className="text-left p-2.5 rounded-lg border border-border-subtle hover:border-primary/40 hover:bg-primary/5 transition-colors">
                <p className="text-xs text-text-tertiary">Plus-one missing</p>
                <p className="text-base font-semibold text-text-primary">{rsvpOps.plusOneMissingName}</p>
              </button>
              <button onClick={() => { setSearchQuery(''); setFilterStatus('pending'); }} className="text-left p-2.5 rounded-lg border border-border-subtle hover:border-primary/40 hover:bg-primary/5 transition-colors">
                <p className="text-xs text-text-tertiary">No response</p>
                <p className="text-base font-semibold text-text-primary">{rsvpOps.noResponse}</p>
              </button>
              <button onClick={() => { setSearchQuery(''); setFilterStatus('pending-no-email'); setViewMode('list'); }} className="text-left p-2.5 rounded-lg border border-border-subtle hover:border-primary/40 hover:bg-primary/5 transition-colors">
                <p className="text-xs text-text-tertiary">Pending, no email</p>
                <p className="text-base font-semibold text-text-primary">{rsvpOps.pendingNoEmail}</p>
              </button>
              <button onClick={() => { setSearchQuery(''); setFilterStatus('ceremony-no'); }} className="text-left p-2.5 rounded-lg border border-border-subtle hover:border-primary/40 hover:bg-primary/5 transition-colors">
                <p className="text-xs text-text-tertiary">Ceremony: No</p>
                <p className="text-base font-semibold text-text-primary">{rsvpOps.ceremonyNo}</p>
              </button>
              <button onClick={() => { setSearchQuery(''); setFilterStatus('reception-no'); }} className="text-left p-2.5 rounded-lg border border-border-subtle hover:border-primary/40 hover:bg-primary/5 transition-colors">
                <p className="text-xs text-text-tertiary">Reception: No</p>
                <p className="text-base font-semibold text-text-primary">{rsvpOps.receptionNo}</p>
              </button>
            </div>
          </div>
        </details>
        )}

        {!cleanGuestsView && (() => {
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

        {!cleanGuestsView && rsvpConflicts.length > 0 && (
          <div className="p-4 bg-error-light border border-error/20 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-error" />
                <p className="text-sm font-medium text-error">{rsvpConflicts.length} RSVP {rsvpConflicts.length === 1 ? 'item' : 'items'} to review</p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={conflictFilter}
                  onChange={(e) => setConflictFilter(e.target.value as 'all' | 'error' | 'warning')}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'error', label: 'Needs attention' },
                    { value: 'warning', label: 'Heads-up' },
                  ]}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={visibleRsvpConflicts.length === 0 || resolvingConflictId === 'all'}
                  onClick={resolveAllVisibleConflicts}
                >
                  {resolvingConflictId === 'all' ? 'Resolving…' : `Resolve ${visibleRsvpConflicts.length}`}
                </Button>
              </div>
            </div>
            <div className="text-xs text-error/90">
              {rsvpConflictStats.unresolvedOver72h > 0
                ? `${rsvpConflictStats.unresolvedOver72h} item${rsvpConflictStats.unresolvedOver72h === 1 ? '' : 's'} have been waiting over 3 days.`
                : rsvpConflictStats.unresolvedOver24h > 0
                  ? `${rsvpConflictStats.unresolvedOver24h} item${rsvpConflictStats.unresolvedOver24h === 1 ? '' : 's'} have been waiting over a day.`
                  : 'You have RSVP items ready for review.'}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConflictDetails((v) => !v)}
              >
                {showConflictDetails ? 'Hide details' : 'View details'}
              </Button>
            </div>

            {showConflictDetails && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="bg-white/80 border border-error/20 rounded-md px-2.5 py-2">
                    <p className="text-[10px] uppercase text-error/70">Open now</p>
                    <p className="text-sm font-semibold text-error">{rsvpConflictStats.openNow}</p>
                  </div>
                  <div className="bg-white/80 border border-error/20 rounded-md px-2.5 py-2">
                    <p className="text-[10px] uppercase text-error/70">Opened (24h)</p>
                    <p className="text-sm font-semibold text-error">{rsvpConflictStats.opened24h}</p>
                  </div>
                  <div className="bg-white/80 border border-error/20 rounded-md px-2.5 py-2">
                    <p className="text-[10px] uppercase text-error/70">Resolved (24h)</p>
                    <p className="text-sm font-semibold text-error">{rsvpConflictStats.resolved24h}</p>
                  </div>
                </div>

                {rsvpConflictStats.topCodes.length > 0 && (
                  <div className="text-[11px] text-error/90">
                    <span className="font-semibold">Top reasons:</span>{' '}
                    {rsvpConflictStats.topCodes.map((c) => `${c.code} (${c.count})`).join(' · ')}
                  </div>
                )}
              </>
            )}

            <ul className="space-y-1.5">
              {visibleRsvpConflicts.slice(0, 8).map((c) => {
                const guestName = guests.find((g) => g.id === c.guest_id)?.name || 'Unknown guest';
                return (
                  <li key={c.id} className="text-xs text-error/90 flex items-start justify-between gap-3">
                    <span>
                      • {guestName}: {c.message}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={resolvingConflictId === c.id}
                      onClick={() => resolveConflict(c.id)}
                    >
                      {resolvingConflictId === c.id ? 'Resolving…' : 'Resolve'}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <Card variant="bordered" padding="lg" className="border-border-subtle shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-text-primary">Guest ops coach</p>
                <Badge variant={guestOpsCoach.tone === 'urgent' ? 'error' : guestOpsCoach.tone === 'steady' ? 'warning' : 'success'}>
                  {guestOpsCoach.statusLabel}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-text-secondary">{guestOpsCoach.summary}</p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 px-4 py-3 lg:min-w-[180px]">
              <p className="text-[11px] uppercase tracking-[0.22em] text-text-tertiary">Readiness</p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">{guestOpsCoach.readinessScore}%</p>
              <p className="mt-1 text-xs text-text-secondary">How ready the RSVP and follow-up lane feels right now.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {guestOpsCoach.actions.slice(0, 3).map((action) => (
              <div key={action.id} className="rounded-2xl border border-border-subtle bg-white px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                <p className="text-sm font-semibold text-text-primary">{action.title}</p>
                <p className="mt-2 text-xs leading-5 text-text-secondary">{action.detail}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (action.area === 'messages') {
                        navigate('/dashboard/messages');
                        return;
                      }
                      setFilterStatus(action.filter as typeof filterStatus);
                      setViewMode('list');
                      setSearchQuery('');
                    }}
                  >
                    {action.ctaLabel}
                  </Button>
                  {action.id !== 'healthy' && action.id !== 'import-guests' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addFollowUpTask(action.taskLabel)}
                    >
                      Save task
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card variant="bordered" padding="lg" className="border-border-subtle shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-text-primary">Outreach sequence</p>
              <h3 className="mt-2 text-xl font-semibold text-text-primary">{guestOutreachSequence.headline}</h3>
              <p className="mt-2 text-sm text-text-secondary">{guestOutreachSequence.summary}</p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 px-4 py-3 md:min-w-[220px]">
              <p className="text-[11px] uppercase tracking-[0.22em] text-text-tertiary">Why this order</p>
              <p className="mt-1 text-sm text-text-secondary">Guests, reminders, and live updates now share one order of operations instead of competing for attention.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {guestOutreachSequence.steps.map((step) => (
              <div key={step.id} className="rounded-2xl border border-border-subtle bg-white px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary">{step.title}</p>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    step.status === 'current'
                      ? 'border border-primary/20 bg-primary-light text-primary'
                      : step.status === 'next'
                        ? 'border border-warning/20 bg-warning-light text-warning'
                        : step.status === 'then'
                          ? 'border border-border-subtle bg-surface-subtle text-text-secondary'
                          : 'border border-success/20 bg-success-light text-success'
                  }`}>
                    {step.status === 'current' ? 'Current' : step.status === 'next' ? 'Next' : step.status === 'then' ? 'Then' : 'Steady'}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-text-secondary">{step.detail}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (step.area === 'messages') {
                        navigate('/dashboard/messages');
                        return;
                      }
                      setFilterStatus((step.filter ?? 'all') as typeof filterStatus);
                      setViewMode('list');
                      setSearchQuery('');
                    }}
                  >
                    {step.ctaLabel}
                  </Button>
                  {step.id !== 'steady' && step.id !== 'import-guests' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addFollowUpTask(step.title)}
                    >
                      Save task
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card variant="bordered" padding="lg">
          <div className="space-y-6">

            {!cleanGuestsView && recommendedAction && (
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

            {!cleanGuestsView && opsQueue.length > 0 && (
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
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
              <p className="font-medium text-primary">{plannerHandoff.title}</p>
              <p className="mt-1 text-primary/80">{plannerHandoff.detail}</p>
              <p className="mt-2 text-primary/70">Use this surface to move guest work forward, but couple approval still matters for sensitive calls.</p>
            </div>

            {fromQuickStart && nextStep === 'photos' && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Next up: import guests, then add photos</p>
                  <p className="text-xs text-text-secondary mt-1">Import your guest list here. If you want to skip this for now, jump straight to photos and come back later.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate(buildQuickStartPhotosPath())}>
                  Skip to photos
                </Button>
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
                <input
                  ref={csvFileInputRef}
                  type="file"
                  accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={importCSV}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => csvFileInputRef.current?.click()}
                  disabled={csvImporting || !canEditGuests}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {csvImporting ? 'Parsing…' : 'Import Guests'}
                </Button>


                <Button variant="primary" size="md" onClick={() => { resetForm(); setShowAddModal(true); }} disabled={!canEditGuests}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Guest
                </Button>

                <div className="relative">
                  <Button variant="outline" size="md" onClick={() => setShowOpsMenu(v => !v)} disabled={!canEditGuests}>
                    Actions
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                  {showOpsMenu && (
                    <div className="absolute right-0 z-20 mt-1 w-64 bg-white border border-border rounded-lg shadow-lg p-1 max-h-96 overflow-auto">
                      <fieldset disabled={!canEditGuests} className="disabled:opacity-50">
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => { exportCSV(); setShowOpsMenu(false); }}>Export all guests</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => { exportFilteredCSV(); setShowOpsMenu(false); }}>Export filtered guests</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => { exportRsvpRespondersCSV(); setShowOpsMenu(false); }}>Export RSVP responders</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => { exportAttendingGuestsCSV(); setShowOpsMenu(false); }}>Export attending guests</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => { exportDeclinedGuestsCSV(); setShowOpsMenu(false); }}>Export declined guests</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => { exportPendingGuestsCSV(); setShowOpsMenu(false); }}>Export pending RSVP</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => { exportMissingMealCSV(); setShowOpsMenu(false); }}>Export missing meal choices</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => { exportAddressCollectionCSV(); setShowOpsMenu(false); }}>Export addresses (mailing)</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => { exportCheckedInCSV(); setShowOpsMenu(false); }}>Export checked-in guests</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => { exportThankYouDueCSV(); setShowOpsMenu(false); }}>Export thank-you due</button>
                      <button
                        className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded disabled:opacity-50"
                        disabled={filteredGuestUpdateRecipients.length === 0}
                        onClick={() => { handleCopyFilteredGuestUpdateLinks(); setShowOpsMenu(false); }}
                      >
                        Copy filtered guest update links
                      </button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => { handleCopyNoContactChecklist(); setShowOpsMenu(false); }}>Copy no-contact checklist</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded disabled:opacity-50" disabled={smsRsvpLinkCandidates.length === 0} onClick={() => { copySmsRsvpLinksForFiltered(); setShowOpsMenu(false); }}>Copy SMS RSVP links</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded disabled:opacity-50" disabled={reminderCandidates.length === 0} onClick={() => { handleCopyFilteredEmails(); setShowOpsMenu(false); }}>Copy filtered emails</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded disabled:opacity-50" disabled={bulkSending || reminderCandidates.length === 0} onClick={() => { handleSendBulkInvitations(); setShowOpsMenu(false); }} title={reminderCandidates.length === 0 ? 'No eligible recipients in this segment' : undefined}>{bulkSending ? 'Sending…' : `Remind filtered (${reminderCandidates.length})`}</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded disabled:opacity-50" disabled={bulkSending || dueReminderCandidatesGlobal.length === 0} onClick={() => { handleSendDueRemindersNow(); setShowOpsMenu(false); }} title={dueReminderCandidatesGlobal.length === 0 ? 'No guests due for reminders' : undefined}>{bulkSending ? 'Sending…' : `Send due reminders (${dueReminderCandidatesGlobal.length})`}</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={async () => { const previous = autoRemindersEnabled; const next = !previous; try { setAutoRemindersEnabled(next); await persistReminderSettings({ auto_reminders_enabled: next }); toast(next ? 'Auto reminders enabled' : 'Auto reminders paused', 'success'); } catch { setAutoRemindersEnabled(previous); toast('Failed to save auto reminder setting', 'error'); } setShowOpsMenu(false); }}>{autoRemindersEnabled ? '✓ ' : ''}{autoRemindersEnabled ? 'Auto reminders: On' : 'Auto reminders: Off'}</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={async () => { await handleMarkAllDueThankYous(); setShowOpsMenu(false); }}>Mark all thank-you due as sent</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={async () => { await handleClearAllCheckIns(); setShowOpsMenu(false); }}>Clear all check-ins</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => { generateChecklistTasks(); setShowOpsMenu(false); }}>Create checklist</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => {
                        const lines = followUpTasks.map((t) => `- [ ] ${t.text}`);
                        const text = lines.length ? lines.join('\n') : '- [ ] No follow-up tasks yet';
                        navigator.clipboard.writeText(text).then(() => toast('Copied checklist markdown', 'success')).catch(() => window.prompt('Copy checklist:', text));
                        setShowOpsMenu(false);
                      }}>Copy checklist</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => { selectUnresolvedGuests(); setShowOpsMenu(false); }}>Select unresolved</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => { selectFilteredGuests(); setShowOpsMenu(false); }}>Select filtered</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded disabled:opacity-50" disabled={bulkSending || selectedGuestIds.size === 0} onClick={() => { handleSendSelectedInvitations(); setShowOpsMenu(false); }}>{bulkSending ? 'Sending…' : `Remind selected (${selectedGuestIds.size})`}</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded disabled:opacity-50" disabled={selectedGuestIds.size === 0} onClick={() => { clearGuestSelection(); setShowOpsMenu(false); }}>Clear selection</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded disabled:opacity-50" disabled={!nextUnresolvedGuest} onClick={() => {
                        if (nextUnresolvedGuest) {
                          setSearchQuery((nextUnresolvedGuest.first_name || nextUnresolvedGuest.last_name) ? `${nextUnresolvedGuest.first_name ?? ''} ${nextUnresolvedGuest.last_name ?? ''}`.trim() : nextUnresolvedGuest.name);
                          setViewMode('list');
                        }
                        setShowOpsMenu(false);
                      }}>Next unresolved</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded disabled:opacity-50" disabled={reminderCandidates.length === 0} onClick={() => {
                        window.alert(`Campaign dry run (${segmentLabelMap[filterStatus] || filterStatus})\nRecipients: ${reminderCandidates.length}\n\n${dryRunRecipientPreview.join('\n')}${reminderCandidates.length > dryRunRecipientPreview.length ? `\n+${reminderCandidates.length - dryRunRecipientPreview.length} more` : ''}`);
                        setShowOpsMenu(false);
                      }}>Dry run</button>
                      <div className="my-1 border-t border-border-subtle" />
                      <button
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                        disabled={guests.length === 0 || isDemoMode}
                        onClick={() => {
                          setShowOpsMenu(false);
                          setNuclearConfirmInput('');
                          setShowNuclearDeleteModal(true);
                        }}
                      >
                        Nuclear delete all guests
                      </button>
                      </fieldset>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {csvSelectedFilename && (
              <p className="text-xs text-text-tertiary mt-2">Selected file: <span className="font-medium text-text-secondary">{csvSelectedFilename}</span></p>
            )}

            {!cleanGuestsView && (
            <div className="p-3 rounded-xl border border-border-subtle bg-surface-subtle">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Campaign insights & reminders</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Segment: <span className="font-semibold text-text-primary">{segmentLabelMap[filterStatus] || filterStatus}</span> · Eligible: <span className="font-semibold text-text-primary">{reminderCandidates.length}</span>
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowCampaignModal(true)}>Open</Button>
              </div>
            </div>
            )}

            {!cleanGuestsView && showCampaignModal && (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-3">
                <div className="w-full max-w-2xl max-h-[88vh] overflow-auto rounded-2xl border border-border bg-white shadow-2xl">
                  <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">Campaign insights & reminders</p>
                      <p className="text-xs text-text-tertiary">Focused controls without cluttering the main screen</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowCampaignModal(false)}>Close</Button>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="text-xs text-text-secondary">Top blockers: <span className="font-medium text-text-primary">No response ({rsvpOps.noResponse})</span> · <span className="font-medium text-text-primary">Manual follow-up ({filteredGuests.filter((g) => fallbackByGuest.get(g.id)?.state === 'manual-follow-up').length})</span> · <span className="font-medium text-text-primary">Handled manually ({filteredGuests.filter((g) => fallbackByGuest.get(g.id)?.state === 'manual-handled').length})</span> · <span className="font-medium text-text-primary">Pending w/o email ({rsvpOps.pendingNoEmail})</span> · <span className="font-medium text-text-primary">No contact ({contactStats.withNoContact})</span></div>
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
                        <option value="manual-handled">Handled manually ({filteredGuests.filter((g) => fallbackByGuest.get(g.id)?.state === 'manual-handled').length})</option>
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
                      <button onClick={() => { setFilterStatus('pending'); setViewMode('list'); setShowCampaignModal(false); }} className="text-[11px] px-2 py-1 rounded-full border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Focus pending</button>
                      <button onClick={() => { setFilterStatus('missing-meal'); setViewMode('list'); setShowCampaignModal(false); }} className="text-[11px] px-2 py-1 rounded-full border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Focus missing meal</button>
                      <button onClick={() => { setFilterStatus('plusone-missing'); setViewMode('list'); setShowCampaignModal(false); }} className="text-[11px] px-2 py-1 rounded-full border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Focus plus-one names</button>
                      <button onClick={() => { setFilterStatus('pending-no-email'); setViewMode('list'); setShowCampaignModal(false); }} className="text-[11px] px-2 py-1 rounded-full border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Focus pending no-email</button>
                      <button onClick={() => { setFilterStatus('manual-handled'); setViewMode('list'); setShowCampaignModal(false); }} className="text-[11px] px-2 py-1 rounded-full border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Focus manual-handled</button>
                      <button onClick={() => { setFilterStatus('missing-meal'); setViewMode('list'); setShowCampaignModal(false); }} className="text-[11px] px-2 py-1 rounded-full border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Focus missing meal</button>
                      <button onClick={() => { setFilterStatus('all'); setViewMode('list'); setSearchQuery(''); setSortByPriority(true); setShowCampaignModal(false); }} className="text-[11px] px-2 py-1 rounded-full border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Focus high-risk first</button>
                      <button onClick={() => { setSearchQuery(''); setFilterStatus('no-contact'); setViewMode('list'); setShowCampaignModal(false); }} className="text-[11px] px-2 py-1 rounded-full border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Review no-contact ({contactStats.withNoContact})</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border-subtle bg-surface-subtle">
              <p className="text-xs text-text-secondary">
                Active segment: <span className="font-semibold text-text-primary">{segmentLabelMap[filterStatus] || filterStatus}</span>
                {extraFilters.length > 0 ? <> · +<span className="font-semibold text-text-primary">{extraFilters.length}</span> filters</> : null}
                {searchQuery ? <> · Search: <span className="font-semibold text-text-primary">“{searchQuery}”</span></> : null}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setFilterStatus('all'); setExtraFilters([]); setSearchQuery(''); setViewMode('list'); }}
                  className="text-xs px-2 py-1 rounded-md border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary"
                >
                  Clear filters
                </button>
              </div>
            </div>

            {filteredGuests.some((guest) => (exceptionStateByGuest.get(guest.id) || []).length > 0) && filterStatus === 'all' && (
              <div className="p-2.5 rounded-lg border border-warning/30 bg-warning/10 text-warning text-xs space-y-2">
                <p>Some guests have RSVP exception states that need a manual decision.</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleCopyExceptionChecklist()} className="px-2 py-1 rounded-md border border-warning/30 bg-white text-warning hover:bg-warning/5">Copy exception checklist</button>
                </div>
              </div>
            )}

            {filterStatus === 'missing-meal' && (
              <div className="p-2.5 rounded-lg border border-warning/30 bg-warning/10 text-warning text-xs space-y-2">
                <p>These guests are attending but still need a meal choice.</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleCopyMissingMealChecklist()} className="px-2 py-1 rounded-md border border-warning/30 bg-white text-warning hover:bg-warning/5">Copy meal follow-up checklist</button>
                  <button onClick={() => setShowCampaignModal(true)} className="px-2 py-1 rounded-md border border-warning/30 bg-white text-warning hover:bg-warning/5">Send follow-up</button>
                </div>
              </div>
            )}

            {filterStatus === 'no-contact' && (
              <div className="p-2.5 rounded-lg border border-warning/30 bg-warning/10 text-warning text-xs space-y-2">
                <p>These guests have no email or phone. Add contact info before reminder campaigns.</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleCopyNoContactChecklist()} className="px-2 py-1 rounded-md border border-warning/30 bg-white text-warning hover:bg-warning/5">Copy follow-up checklist</button>
                  <button
                    onClick={() => handleCopyFilteredGuestUpdateLinks()}
                    className="px-2 py-1 rounded-md border border-warning/30 bg-white text-warning hover:bg-warning/5"
                  >
                    Copy guest update links
                  </button>
                </div>
              </div>
            )}

            <div className="sticky top-2 z-10 flex gap-2 flex-wrap items-start justify-between bg-white/95 backdrop-blur p-2.5 rounded-xl border border-border/50">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {([
                    ['all', `All (${stats.total})`],
                    ['confirmed', `Confirmed (${stats.confirmed})`],
                    ['declined', `Declined (${stats.declined})`],
                    ['pending', `Pending (${stats.pending})`],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { setFilterStatus(value); setExtraFilters([]); }}
                      className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                        filterStatus === value
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white text-text-secondary border-border/70 hover:border-primary/35 hover:text-primary'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => { setCheckInMode(false); setViewMode(v => v === 'households' ? 'list' : 'households'); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border whitespace-nowrap shrink-0 ${
                  viewMode === 'households' && !checkInMode
                    ? 'bg-primary text-text-inverse border-primary'
                    : 'text-text-secondary border-border hover:border-primary hover:text-primary'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                Households
              </button>
              <button
                onClick={() => { setCheckInMode(v => !v); setViewMode('list'); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border whitespace-nowrap shrink-0 ${
                  checkInMode
                    ? 'bg-success text-white border-success'
                    : 'text-text-secondary border-border hover:border-success/60 hover:text-success'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Check-in mode
              </button>
            </div>


            {checkInMode && (
              <div className="mb-3 flex items-center justify-between px-4 py-2.5 bg-success/10 border border-success/25 rounded-xl">
                <span className="text-sm font-medium text-success">Check-in mode active · {guests.filter((g) => !!(g as GuestWithRSVP & { checked_in_at?: string | null }).checked_in_at).length} checked in</span>
                <button
                  onClick={() => setFilterStatus('checked-in')}
                  className="text-xs px-2 py-1 rounded-md border border-success/30 bg-white text-success hover:bg-success/5"
                >
                  View checked-in
                </button>
              </div>
            )}

            {checkInMode && lastCheckIn && (
              <div className="mb-3 flex items-center justify-between px-4 py-2 bg-surface-subtle border border-border rounded-xl">
                <span className="text-xs text-text-secondary">Last check-in: <span className="font-medium text-text-primary">{lastCheckIn.guestName}</span></span>
                <button
                  onClick={handleUndoLastCheckIn}
                  className="text-xs px-2 py-1 rounded-md border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary"
                >
                  Undo
                </button>
              </div>
            )}

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
                  onClick={() => { setFilterStatus('all'); setExtraFilters([]); setSearchQuery(''); }}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  Clear filters to view all guests
                </button>
              </div>
            ) : viewMode === 'households' ? (
              <div className="space-y-6">
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
                    <p className="text-sm text-text-tertiary">Select guests from the list view to group them into a household.</p>
                  </div>
                )}

                {households.grouped.map(([householdId, members]) => {
                  return (
                    <div key={householdId} className="border border-border/30 rounded-2xl overflow-hidden bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)] hover:shadow-[0_10px_26px_rgba(15,23,42,0.09)] transition-shadow">
                      <div className="divide-y divide-border-subtle/60 bg-white">
                        {members.map(guest => {
                            const name = guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.name;
                            return (
                              <div key={guest.id} className="flex items-center justify-between px-5 py-3.5">
                                <div>
                                  <p className="text-sm font-medium text-text-primary">{name}</p>
                                  <p className="text-xs text-text-tertiary break-words">{guest.email || 'No email'}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  {getStatusBadge(guest.rsvp_status)}
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
                      <p className="text-xs text-text-tertiary break-words">Select guests to group them into households</p>
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
                  <table className="w-full text-sm">
                    <thead className="bg-surface-subtle border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Guest</th>
                        <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Status</th>
                        <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary hidden md:table-cell">Plus One</th>
                        <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary hidden lg:table-cell">Meal Choice</th>
                        <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary hidden xl:table-cell">Invite Code</th>
                        <th className="text-right px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {displayedGuests.map((guest) => (
                        <tr
                          key={guest.id}
                          className="border-b border-border-subtle/70 hover:bg-surface-subtle/60 transition-colors cursor-pointer"
                          onClick={() => openItineraryDrawer(guest)}
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="text-sm font-medium text-text-primary">
                                  {guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.name}
                                </p>
                                <p className="text-sm text-text-secondary">{guest.email || '—'}</p>
                                {checkInMode && (guest as GuestWithRSVP & { checked_in_at?: string | null }).checked_in_at && (
                                  <p className="text-xs text-success">Checked in {formatGuestOpsDateTime((guest as GuestWithRSVP & { checked_in_at?: string | null }).checked_in_at, { hour: 'numeric', minute: '2-digit' })}</p>
                                )}
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-text-tertiary ml-1 opacity-0 group-hover:opacity-100" />
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-col gap-1">
                              {getStatusBadge(guest.rsvp_status)}
                              {guest.rsvp_received_at && hasRespondedRsvpStatus(guest.rsvp_status) && (
                                <span className="text-xs text-text-tertiary break-words">
                                  {formatGuestOpsDate(guest.rsvp_received_at)}
                                </span>
                              )}
                              {(() => {
                                const lifecycle = getInviteLifecycleState({
                                  invitationSentAt: (guest as GuestWithRSVP & { invitation_sent_at?: string | null }).invitation_sent_at ?? null,
                                  reminderLastSentAt: (guest as GuestWithRSVP & { reminder_last_sent_at?: string | null }).reminder_last_sent_at ?? null,
                                  rsvpStatus: guest.rsvp_status,
                                  manualHandled: typeof guest.notes === 'string' && guest.notes.toLowerCase().includes('[manual rsvp]'),
                                });
                                return (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full border bg-surface-subtle text-text-tertiary border-border">
                                    {lifecycle.label}
                                  </span>
                                );
                              })()}
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
                          <td className="px-4 py-2.5 text-text-secondary hidden md:table-cell">
                            {(() => { const plusOneState = getPlusOneState({ plusOneAllowed: guest.plus_one_allowed, plusOneName: guest.rsvp?.plus_one_name, attending: guest.rsvp?.attending }); return plusOneState.label; })()}
                          </td>
                          <td className="px-4 py-2.5 text-text-secondary hidden lg:table-cell">
                            {guest.rsvp?.meal_choice || '—'}
                          </td>
                          <td className="px-4 py-2.5 hidden xl:table-cell">
                            <code className="text-xs bg-surface-subtle px-2 py-1 rounded font-mono">
                              {guest.invite_token?.slice(0, 12) || '—'}
                            </code>
                          </td>
                          <td className="px-4 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-end gap-1.5">
                              {checkInMode ? (
                                <Button
                                  variant={guest.checked_in_at ? 'outline' : 'primary'}
                                  size="sm"
                                  className={`px-3 py-1.5 text-xs ${guest.checked_in_at ? 'text-success border-success/40' : ''}`}
                                  onClick={() => handleToggleCheckIn(guest)}
                                  title={guest.checked_in_at ? 'Clear check-in' : 'Mark checked in'}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  {guest.checked_in_at ? 'Checked in' : 'Check in'}
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="px-2 py-1 text-xs"
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
                                      className="px-2 py-1 text-xs"
                                      onClick={() => handleSendInvitation(guest)}
                                      disabled={sendingInviteId === guest.id || isGuestsReadOnly}
                                      title={guest.invite_token ? 'Send invitation email' : 'Send invitation'}
                                    >
                                      <Mail className="w-4 h-4 mr-1" />
                                      {sendingInviteId === guest.id ? 'Sending…' : 'Invite'}
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`px-2 py-1 text-xs ${guest.checked_in_at ? 'text-success' : ''}`}
                                    onClick={() => handleToggleCheckIn(guest)}
                                    disabled={isGuestsReadOnly}
                                    title={guest.checked_in_at ? 'Clear check-in' : 'Mark checked in'}
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    {guest.checked_in_at ? 'Checked in' : 'Check in'}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`px-2 py-1 text-xs ${(guest as GuestWithRSVP & { thank_you_sent_at?: string | null }).thank_you_sent_at ? 'text-success' : ''}`}
                                    onClick={() => handleMarkThankYouSent(guest)}
                                    disabled={isGuestsReadOnly}
                                    title={(guest as GuestWithRSVP & { thank_you_sent_at?: string | null }).thank_you_sent_at ? 'Clear thank-you sent' : 'Mark thank-you sent'}
                                  >
                                    {(guest as GuestWithRSVP & { thank_you_sent_at?: string | null }).thank_you_sent_at ? 'Thanked' : 'Thank-you'}
                                  </Button>
                                  <Button variant="ghost" size="sm" className="px-2 py-1 text-xs" onClick={() => openAssistedRsvpModal(guest)} disabled={isGuestsReadOnly}>
                                    Record RSVP
                                  </Button>
                                  <Button variant="ghost" size="sm" className="px-2 py-1 text-xs" onClick={() => openEditModal(guest)} disabled={isGuestsReadOnly}>
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteGuest(guest.id)}
                                    disabled={deletingGuestId === guest.id || isGuestsReadOnly}
                                    className={`px-2 py-1 text-xs ${confirmDeleteId === guest.id ? 'text-error hover:text-error' : ''}`}
                                  >
                                    {deletingGuestId === guest.id
                                      ? 'Removing…'
                                      : confirmDeleteId === guest.id
                                      ? 'Confirm?'
                                      : 'Delete'}
                                  </Button>
                                </>
                              )}
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
                      {searchQuery ? 'Try a different search term' : 'Add your first guest to get started.'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </div>



      {assistedRsvpGuest && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => !assistedRsvpSaving && setAssistedRsvpGuest(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl border border-border bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">Record RSVP for guest</h3>
                  <p className="text-sm text-text-secondary mt-1">Save a response that came in by phone, text, family relay, or in person.</p>
                </div>
                <button onClick={() => !assistedRsvpSaving && setAssistedRsvpGuest(null)} className="p-2 rounded-lg hover:bg-surface-subtle text-text-secondary">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="rounded-xl border border-border-subtle bg-surface-subtle/30 p-4">
                  <p className="text-sm font-medium text-text-primary">{assistedRsvpGuest.first_name && assistedRsvpGuest.last_name ? `${assistedRsvpGuest.first_name} ${assistedRsvpGuest.last_name}` : assistedRsvpGuest.name}</p>
                  <p className="mt-1 text-xs text-text-secondary">This keeps manual handling explicit instead of pretending the guest self-submitted.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Response</label>
                    <Select value={assistedRsvpStatus} onChange={(e) => setAssistedRsvpStatus(e.target.value as 'confirmed' | 'declined')} options={[{ value: 'confirmed', label: 'Attending' }, { value: 'declined', label: 'Declined' }]} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Source</label>
                    <Select value={assistedRsvpSource} onChange={(e) => setAssistedRsvpSource(e.target.value as 'phone' | 'text' | 'family' | 'in-person')} options={[{ value: 'phone', label: 'Phone call' }, { value: 'text', label: 'Text message' }, { value: 'family', label: 'Family relay' }, { value: 'in-person', label: 'In person' }]} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Notes</label>
                  <Textarea value={assistedRsvpNotes} onChange={(e) => setAssistedRsvpNotes(e.target.value)} placeholder="Optional detail, like who confirmed it or what still needs follow-up." rows={4} />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
                <Button variant="outline" size="sm" onClick={() => setAssistedRsvpGuest(null)} disabled={assistedRsvpSaving}>Cancel</Button>
                <Button variant="primary" size="md" onClick={handleSaveAssistedRsvp} disabled={assistedRsvpSaving}>
                  {assistedRsvpSaving ? 'Saving…' : 'Save manual RSVP'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {showAddModal && renderGuestFormModal({
        title: 'Add guest',
        submitLabel: 'Add guest',
        onSubmit: handleAddGuest,
        onClose: () => { setShowAddModal(false); resetForm(); },
      })}

      {editingGuest && renderGuestFormModal({
        title: 'Edit guest',
        submitLabel: 'Save guest',
        onSubmit: handleEditGuest,
        onClose: () => { setEditingGuest(null); resetForm(); },
      })}

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
                <p className="text-xs text-text-secondary mt-0.5">Guest updates and itinerary invitations</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => copyContactRequestLink(itineraryDrawerGuest)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-border hover:border-primary hover:text-primary transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy guest update link
                  </button>
                  {itineraryDrawerGuest.invite_token && (
                    <button
                      onClick={async () => {
                        const inviteLink = buildRsvpInviteUrl(window.location.origin, itineraryDrawerGuest.invite_token!);
                        try {
                          await navigator.clipboard.writeText(inviteLink);
                          toast('Copied RSVP link', 'success');
                        } catch {
                          window.prompt('Copy RSVP link:', inviteLink);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-border hover:border-primary hover:text-primary transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy RSVP link
                    </button>
                  )}
                </div>
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
                const dietaryNote = extractDietaryNote(itineraryDrawerGuest.rsvp?.custom_answers as Record<string, unknown> | null | undefined, itineraryDrawerGuest.notes);
                const householdMembers = itineraryDrawerGuest.household_id
                  ? guests.filter((guest) => guest.household_id === itineraryDrawerGuest.household_id)
                  : [];

                return (
                  <>
                    <div className="mb-4 p-4 bg-surface-subtle border border-border rounded-xl space-y-2">
                      <p className="text-xs uppercase updates-wide text-text-tertiary">RSVP details</p>
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
                          <span className="font-medium">Plus-one guest:</span> {plusOne}
                        </div>
                      )}
                      {dietaryNote && (
                        <div className="text-sm text-text-primary">
                          <span className="font-medium">Dietary note:</span> {dietaryNote}
                        </div>
                      )}
                      {entries.length > 0 && (
                        <div className="pt-1 space-y-1.5">
                          <p className="text-xs uppercase updates-wide text-text-tertiary">Custom answers</p>
                          {entries.map((entry) => (
                            <div key={entry.key} className="text-sm text-text-primary flex items-start justify-between gap-3">
                              <span className="text-text-secondary truncate">{entry.key}</span>
                              <span className="text-right">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mb-4 p-4 bg-surface-subtle border border-border rounded-xl space-y-2">
                      <p className="text-xs uppercase updates-wide text-text-tertiary">Per-event RSVP structure</p>
                      {(() => { const eventState = getPerEventRsvpState({ invitedToCeremony: itineraryDrawerGuest.invited_to_ceremony, invitedToReception: itineraryDrawerGuest.invited_to_reception, invitedEventIds: itineraryDrawerGuest.invited_event_ids as string[] | null | undefined }); return (<>
                        <p className="text-sm text-text-primary">{eventState.summary}</p>
                        <p className="text-sm text-text-secondary">{eventState.detail}</p>
                      </>); })()}
                    </div>

                    <div className="mb-4 p-4 bg-surface-subtle border border-border rounded-xl space-y-2">
                      <p className="text-xs uppercase updates-wide text-text-tertiary">Plus-one truth</p>
                      {(() => { const plusOneState = getPlusOneState({ plusOneAllowed: itineraryDrawerGuest.plus_one_allowed, plusOneName: itineraryDrawerGuest.rsvp?.plus_one_name, attending: itineraryDrawerGuest.rsvp?.attending }); return (<>
                        <p className="text-sm text-text-primary">{plusOneState.label}</p>
                        <p className="text-sm text-text-secondary">{plusOneState.detail}</p>
                      </>); })()}
                    </div>

                    <div className="mb-4 p-4 bg-surface-subtle border border-border rounded-xl space-y-2">
                      <p className="text-xs uppercase updates-wide text-text-tertiary">RSVP exceptions</p>
                      {(() => {
                        const states = getRsvpExceptionStates({
                          householdStatuses: householdMembers.map((member) => member.rsvp_status),
                          plusOneAllowed: itineraryDrawerGuest.plus_one_allowed,
                          plusOneName: itineraryDrawerGuest.rsvp?.plus_one_name,
                          attending: itineraryDrawerGuest.rsvp?.attending,
                          mealChoice: itineraryDrawerGuest.rsvp?.meal_choice,
                          manualHandled: typeof itineraryDrawerGuest.notes === 'string' && itineraryDrawerGuest.notes.toLowerCase().includes('[manual rsvp]'),
                        });
                        return states.length > 0
                          ? <div className="space-y-2">
                              {states.map((state) => <p key={state} className="text-sm text-text-primary">• {state}</p>)}
                              <div className="flex flex-wrap gap-2 pt-1">
                                <button onClick={() => addFollowUpTask(`Resolve RSVP exception for ${(itineraryDrawerGuest.first_name || itineraryDrawerGuest.last_name) ? `${itineraryDrawerGuest.first_name ?? ''} ${itineraryDrawerGuest.last_name ?? ''}`.trim() : itineraryDrawerGuest.name}`)} className="px-2 py-1 rounded-md border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Save follow-up task</button>
                                <button onClick={() => setSearchQuery((itineraryDrawerGuest.first_name || itineraryDrawerGuest.last_name) ? `${itineraryDrawerGuest.first_name ?? ''} ${itineraryDrawerGuest.last_name ?? ''}`.trim() : itineraryDrawerGuest.name)} className="px-2 py-1 rounded-md border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Focus this guest</button>
                              </div>
                            </div>
                          : <p className="text-sm text-text-secondary">No active exception states for this guest.</p>;
                      })()}
                    </div>

                    <div className="mb-4 p-4 bg-surface-subtle border border-border rounded-xl space-y-2">
                      <p className="text-xs uppercase updates-wide text-text-tertiary">Household context</p>
                      {householdMembers.length > 1 ? (
                        <>
                          <p className="text-sm text-text-secondary">This guest is grouped with {householdMembers.length - 1} other household member{householdMembers.length === 2 ? '' : 's'}.</p>
                          <p className={`text-xs ${new Set(householdMembers.map((member) => member.rsvp_status)).size > 1 ? 'text-amber-700' : 'text-text-tertiary'}`}>{new Set(householdMembers.map((member) => member.rsvp_status)).size > 1 ? 'Household responses are mixed right now.' : 'Household responses are aligned right now.'}</p>
                          <div className="space-y-1">
                            {householdMembers.map((member) => (
                              <p key={member.id} className="text-sm text-text-primary">• {member.first_name && member.last_name ? `${member.first_name} ${member.last_name}` : member.name}</p>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-text-secondary">This guest is not currently grouped into a larger household.</p>
                      )}
                    </div>
                  </>
                );
              })()}

              <div className="mb-4 p-4 bg-surface-subtle border border-border rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase updates-wide text-text-tertiary">Recent guest updates</p>
                  <span className="text-[11px] text-text-tertiary">Last {guestAuditEntries.length} updates</span>
                </div>
                {guestAuditEntries.length === 0 ? (
                  <p className="text-xs text-text-tertiary">No recent changes yet. Updates to this guest will appear here automatically.</p>
                ) : (
                  <div className="space-y-2.5">
                    {guestAuditEntries.map((entry) => {
                      const absolute = formatGuestOpsDateTime(entry.changed_at);
                      const relative = formatGuestOpsRelativeTime(entry.changed_at);
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
                              ? formatGuestEventDate(event.event_date)
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

      {showNuclearDeleteModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => !nuclearDeleting && setShowNuclearDeleteModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-border-subtle">
                <h2 className="text-lg font-semibold text-text-primary">Nuclear delete all guests</h2>
                <p className="text-sm text-text-secondary mt-1">This permanently deletes every guest in this site.</p>
              </div>
              <div className="p-6 space-y-3">
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Type <span className="font-semibold">{guests.length}</span> to confirm deletion.
                </div>
                <input
                  type="text"
                  value={nuclearConfirmInput}
                  onChange={(e) => setNuclearConfirmInput(e.target.value)}
                  placeholder={`Type ${guests.length}`}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                  disabled={nuclearDeleting}
                />
              </div>
              <div className="p-6 pt-0 flex gap-2">
                <Button variant="outline" fullWidth disabled={nuclearDeleting} onClick={() => setShowNuclearDeleteModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  className="!bg-red-600 hover:!bg-red-700"
                  disabled={nuclearDeleting || nuclearConfirmInput.trim() !== String(guests.length)}
                  onClick={handleNuclearDeleteAllGuests}
                >
                  {nuclearDeleting ? 'Deleting…' : 'Delete all guests'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {csvShowMapper && csvFieldMap && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { if (!csvImporting) setCsvShowMapper(false); }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-border-subtle">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Map Columns</h2>
                  <p className="text-sm text-text-secondary mt-0.5">Map your file columns before preview/import{csvSelectedFilename ? ` · ${csvSelectedFilename}` : ''}</p>
                </div>
                <button onClick={() => setCsvShowMapper(false)} className="p-2 hover:bg-surface-subtle rounded-lg transition-colors">
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-6 space-y-3">
                {!csvNameMappingValid && (
                  <div className="rounded-lg border border-warning/30 bg-warning-light px-3 py-2 text-xs text-warning">
                    Map both First Name and Last Name before continuing.
                  </div>
                )}
                {([
                  ['first_name', 'First Name (recommended)'],
                  ['last_name', 'Last Name (recommended)'],
                  ['full_name', 'Full Name (optional fallback)'],
                  ['email', 'Email'],
                  ['phone', 'Phone'],
                  ['plus_one', 'Plus One Allowed'],
                  ['status', 'RSVP Status'],
                  ['meal_choice', 'Meal Choice'],
                  ['rsvp_date', 'RSVP Date'],
                  ['invite_token', 'Invite Token'],
                  ['household_id', 'Household ID'],
                  ['household_name', 'Household Name / Group Name'],
                  ['invited_events', 'Invited Events (list)'],
                ] as Array<[keyof CsvFieldMap, string]>).map(([key, label]) => (
                  <label key={key} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                    <span className="text-sm text-text-primary">{label}</span>
                    <div>
                    {key === 'invited_events' ? (
                      <select
                        multiple
                        value={csvFieldMap.invited_events.map(String)}
                        onChange={(e) => {
                          const vals = Array.from(e.currentTarget.selectedOptions).map((o) => Number(o.value));
                          setCsvFieldMap(prev => prev ? { ...prev, invited_events: vals } : prev);
                        }}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface min-h-[110px]"
                      >
                        {csvHeaders.map((header, idx) => (
                          <option key={`${key}-${idx}`} value={idx}>
                            ({csvColumnLetter(idx)}) {header || `column ${idx + 1}`} → {csvColumnSamples[idx] ? csvColumnSamples[idx].slice(0, 40) : 'example'}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={csvFieldMap[key] as number}
                        onChange={(e) => setCsvFieldMap(prev => prev ? { ...prev, [key]: Number(e.target.value) } : prev)}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface"
                      >
                        <option value={-1}>— Not mapped —</option>
                        {csvHeaders.map((header, idx) => (
                          <option key={`${key}-${idx}`} value={idx}>
                            ({csvColumnLetter(idx)}) {header || `column ${idx + 1}`} → {csvColumnSamples[idx] ? csvColumnSamples[idx].slice(0, 40) : 'example'}
                          </option>
                        ))}
                      </select>
                    )}
                    {key === 'invited_events' && (
                      <p className="mt-1 text-[11px] text-text-tertiary">Multi-select supported (Cmd/Ctrl+Click).</p>
                    )}
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex gap-3 p-6 border-t border-border-subtle">
                <Button variant="outline" fullWidth onClick={() => setCsvShowMapper(false)} disabled={csvImporting}>Cancel</Button>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => buildCsvPreviewFromMapping(csvHeaders, csvDataRows, csvFieldMap)}
                  disabled={csvImporting || !csvNameMappingValid}
                >
                  Continue to Review
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {csvPreview && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { if (!csvImporting) { setCsvPreview(null); setCsvUnknownEvents([]); setCsvDuplicateNames([]); setCsvMappingSummary({ core: [], rsvp: [], household: [], eventCols: [], weak: [] }); } }} />
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
                  <button onClick={() => { setCsvPreview(null); setCsvUnknownEvents([]); setCsvDuplicateNames([]); setCsvMappingSummary({ core: [], rsvp: [], household: [], eventCols: [], weak: [] }); }} className="p-2 hover:bg-surface-subtle rounded-lg transition-colors">
                    <X className="w-5 h-5 text-text-secondary" />
                  </button>
                )}
              </div>

              <div className="overflow-y-auto flex-1 p-6">
                {(csvMappingSummary.core.length > 0 || csvMappingSummary.rsvp.length > 0 || csvMappingSummary.household.length > 0 || csvMappingSummary.eventCols.length > 0 || csvMappingSummary.weak.length > 0) && (
                  <div className="mb-4 p-3 bg-surface-subtle border border-border rounded-lg space-y-2">
                    <p className="text-xs font-medium text-text-primary">Detected mapping</p>
                    {csvMappingSummary.core.length > 0 && <p className="text-xs text-text-secondary"><span className="font-medium text-text-primary">Core:</span> {csvMappingSummary.core.join(', ')}</p>}
                    {csvMappingSummary.rsvp.length > 0 && <p className="text-xs text-text-secondary"><span className="font-medium text-text-primary">RSVP:</span> {csvMappingSummary.rsvp.join(', ')}</p>}
                    {csvMappingSummary.household.length > 0 && <p className="text-xs text-text-secondary"><span className="font-medium text-text-primary">Households:</span> {csvMappingSummary.household.join(', ')}</p>}
                    {csvMappingSummary.eventCols.length > 0 && <p className="text-xs text-text-secondary"><span className="font-medium text-text-primary">Itinerary columns:</span> {csvMappingSummary.eventCols.join(', ')}</p>}
                    {csvMappingSummary.weak.length > 0 && <p className="text-xs text-amber-700"><span className="font-medium text-amber-800">Review closely:</span> {csvMappingSummary.weak.join(' · ')}</p>}
                    <p className="text-[11px] text-text-tertiary">Invite values: Yes/Y/1/True/Included/Invited = invited · No/N/0/False/Excluded/Not Invited = not invited</p>
                  </div>
                )}

                {csvSkipped.length > 0 && (
                  <div className="mb-4 p-3 bg-warning-light border border-warning/20 rounded-lg">
                    <p className="text-xs font-medium text-warning mb-1">{csvSkipped.length} row{csvSkipped.length !== 1 ? 's' : ''} will be skipped (missing name)</p>
                    <ul className="space-y-0.5">
                      {csvSkipped.map((s, i) => <li key={i} className="text-xs text-warning/80">• {s}</li>)}
                    </ul>
                  </div>
                )}

                {csvUnknownEvents.length > 0 && (
                  <div className="mb-4 p-3 bg-surface-subtle border border-border rounded-lg">
                    <p className="text-xs font-medium text-text-primary mb-1">Unmatched itinerary event names ({csvUnknownEvents.length})</p>
                    <p className="text-xs text-text-secondary mb-1">These names were not found in your itinerary and will be ignored for event invites.</p>
                    <ul className="space-y-0.5">
                      {csvUnknownEvents.slice(0, 10).map((name, i) => <li key={i} className="text-xs text-text-secondary">• {name}</li>)}
                    </ul>
                  </div>
                )}

                {csvHouseholdWarnings.length > 0 && (
                  <div className="mb-4 p-3 bg-warning-light border border-warning/20 rounded-lg">
                    <p className="text-xs font-medium text-warning mb-1">Household merge warnings ({csvHouseholdWarnings.length})</p>
                    <p className="text-xs text-warning/80 mb-1">These name-only household groups mix last names, so auto-merge will be skipped unless you clean the import.</p>
                    <ul className="space-y-0.5">
                      {csvHouseholdWarnings.slice(0, 10).map((name, i) => <li key={i} className="text-xs text-warning/80">• {name}</li>)}
                    </ul>
                  </div>
                )}

                {csvDuplicateNames.length > 0 && (
                  <div className="mb-4 p-3 bg-warning-light border border-warning/20 rounded-lg">
                    <p className="text-xs font-medium text-warning mb-1">Duplicate full names flagged ({csvDuplicateNames.length})</p>
                    <p className="text-xs text-warning/80 mb-1">These guests share the same First + Last name. Import will continue, but review to avoid unintended duplicates.</p>
                    <ul className="space-y-0.5">
                      {csvDuplicateNames.slice(0, 10).map((name, i) => <li key={i} className="text-xs text-warning/80">• {name}</li>)}
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
                        {Boolean(g.group_name) && <p className="text-[11px] text-text-tertiary truncate">Household: {String(g.group_name)}</p>}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Boolean(g.rsvp_status) && <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-border text-text-tertiary">{String(g.rsvp_status)}</span>}
                          {Boolean(g.__meal_choice) && <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-border text-text-tertiary">Meal: {String(g.__meal_choice)}</span>}
                          {Array.isArray(g.__invited_event_ids) && (g.__invited_event_ids as unknown[]).length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-primary/30 text-primary">{(g.__invited_event_ids as unknown[]).length} event invites</span>}
                        </div>
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
                <Button variant="outline" fullWidth onClick={() => { setCsvPreview(null); setCsvUnknownEvents([]); setCsvDuplicateNames([]); }} disabled={csvImporting}>
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
