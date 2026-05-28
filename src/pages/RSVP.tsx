import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Card } from '../components/ui/Card';
import { GuestJourneyCompanion } from '../components/guest/GuestJourneyCompanion';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { CheckCircle, Search, AlertCircle, User } from 'lucide-react';
import { demoGuests, demoRSVPs } from '../lib/demoData';
import { DEMO_MODE } from '../config/env';
import { formatRsvpDeadline, isRsvpDeadlinePassed } from './rsvpDeadline';
import { RSVP_MISSING_INVITATION_DETAIL_ERROR } from './rsvpGuestCopy';

const RSVP_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-rsvp-token`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const DEMO_RSVP_QUESTIONS_KEY = 'dayof_demo_rsvp_custom_questions_v1';
const DEMO_RSVP_RESPONSES_KEY = 'dayof_demo_rsvp_responses_v1';
const DEMO_RSVP_MEAL_KEY = 'dayof_demo_rsvp_meal_config_v1';
const RSVP_CONTINUITY_EVENT = 'dayof:rsvp-updated';
const RSVP_CONTINUITY_STORAGE_KEY = 'dayof.rsvp.updatedAt';
const DEFAULT_MEAL_CONFIG: RSVPMealConfig = { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] };

function notifyRsvpContinuityUpdate() {
  if (typeof window === 'undefined') return;

  const updatedAt = String(Date.now());

  try {
    window.localStorage.setItem(RSVP_CONTINUITY_STORAGE_KEY, updatedAt);
  } catch {
    // Ignore storage failures for continuity pings.
  }

  window.dispatchEvent(new CustomEvent(RSVP_CONTINUITY_EVENT, { detail: { updatedAt } }));
}

async function rsvpCall(body: object): Promise<{ data?: unknown; error?: string }> {
  const res = await fetch(RSVP_FN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { error: (json as { error?: string })?.error ?? `Error ${res.status}` };
  if ((json as { error?: string })?.error) return { error: (json as { error?: string }).error };
  return { data: json };
}

interface Guest {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  group_name: string | null;
  wedding_site_id: string;
  plus_one_allowed: boolean;
  invited_to_ceremony: boolean;
  invited_to_reception: boolean;
  invite_token: string | null;
}

interface ExistingRSVP {
  id: string;
  attending: boolean;
  attending_ceremony?: boolean | null;
  attending_reception?: boolean | null;
  guest_ids?: string[] | null;
  meal_choice: string | null;
  plus_one_name: string | null;
  plus_one_count?: number | null;
  children_count?: number | null;
  notes: string | null;
  custom_answers?: Record<string, string | string[]> | null;
}

interface HouseholdGuest {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string;
  invite_token: string | null;
  invited_to_ceremony?: boolean;
  invited_to_reception?: boolean;
}

interface RSVPMealConfig {
  enabled: boolean;
  options: string[];
}

interface RSVPQuestion {
  id: string;
  label: string;
  question_text?: string;
  type: 'short_text' | 'long_text' | 'single_choice' | 'multi_choice';
  required?: boolean;
  options?: string[];
  appliesTo?: 'all' | 'ceremony' | 'reception';
}

function maskEmail(email: string | null): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.length > 2 ? local.slice(0, 2) : local.slice(0, 1);
  return `${visible}***@${domain}`;
}

function guestLabel(g: Guest): string {
  if (g.first_name && g.last_name) return `${g.first_name} ${g.last_name}`;
  return g.name || 'Guest';
}

function getRsvpQuestionLabel(question: RSVPQuestion): string {
  const label = question.label?.trim();
  if (label) return label;

  const questionText = question.question_text?.trim();
  if (questionText) return questionText;

  return 'Question';
}

function getRequiredQuestionValidationLabel(question: RSVPQuestion): string {
  const label = getRsvpQuestionLabel(question);
  return label === 'Question' ? 'this question' : label;
}

function normalizeCustomAnswers(answers: Record<string, string | string[]>) {
  return Object.fromEntries(
    Object.entries(answers).map(([questionId, value]) => [
      questionId,
      Array.isArray(value)
        ? value.map((entry) => String(entry).trim()).filter((entry) => entry.length > 0)
        : String(value ?? '').trim(),
    ]),
  );
}

function parseLegacyEventAttendanceToken(value: string | undefined): boolean | undefined {
  const normalized = (value || '').trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === 'yes' || normalized === 'y' || normalized === 'true' || normalized === '1' || normalized === 'on' || normalized === 'enabled' || normalized === 'attending' || normalized === 'going' || normalized === 'included' || normalized === 'in' || normalized === 'confirmed' || normalized === 'accepted' || normalized === 'participating' || normalized === 'joining' || normalized === 'coming' || normalized === 'present') {
    return true;
  }
  if (normalized === 'no' || normalized === 'n' || normalized === 'false' || normalized === '0' || normalized === 'off' || normalized === 'disabled' || normalized === 'excluded' || normalized === 'out' || normalized === 'declined' || normalized === 'skipping' || normalized === 'absent' || normalized === 'unconfirmed' || normalized === 'cancelled' || normalized === 'canceled' || normalized === 'removed' || normalized === 'not attending' || normalized === 'not going' || normalized === 'not included' || normalized === 'not joining' || normalized === 'not coming' || normalized === 'not participating' || normalized === 'not present') {
    return false;
  }
  return undefined;
}

function normalizeLegacyEventKey(value: string | undefined): string {
  const normalized = (value || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (normalized === 'wedding ceremony') return 'ceremony';
  if (normalized === 'wedding reception') return 'reception';
  if (normalized === 'ceremony attendance') return 'ceremony';
  if (normalized === 'reception attendance') return 'reception';
  return normalized;
}

function normalizeExistingRsvp(existingRsvp: ExistingRSVP): ExistingRSVP {
  const mealChoice = (existingRsvp.meal_choice || '').trim();
  const plusOneName = (existingRsvp.plus_one_name || '').trim();
  const notes = (existingRsvp.notes || '').trim();
  const normalizedGuestIds = Array.isArray(existingRsvp.guest_ids)
    ? dedupeGuestIds(existingRsvp.guest_ids.map((guestId) => typeof guestId === 'string' ? guestId : ''))
    : null;

  return {
    ...existingRsvp,
    meal_choice: mealChoice || null,
    plus_one_name: plusOneName || null,
    plus_one_count: plusOneName ? 1 : 0,
    guest_ids: normalizedGuestIds,
    notes: notes || null,
    custom_answers: existingRsvp.custom_answers && typeof existingRsvp.custom_answers === 'object'
      ? normalizeCustomAnswers(existingRsvp.custom_answers as Record<string, string | string[]>)
      : {},
  };
}

function buildNormalizedExistingRsvp(formData: {
  attending: boolean;
  attendCeremony: boolean;
  attendReception: boolean;
  meal_choice: string;
  plus_one_name: string;
  notes: string;
}, customAnswers: Record<string, string | string[]>, id: string, guestIds: string[] = []): ExistingRSVP {
  return normalizeExistingRsvp({
    id,
    attending: formData.attending,
    attending_ceremony: formData.attendCeremony,
    attending_reception: formData.attendReception,
    meal_choice: formData.meal_choice,
    plus_one_name: formData.plus_one_name,
    plus_one_count: formData.plus_one_name.trim() ? 1 : 0,
    children_count: 0,
    guest_ids: guestIds,
    notes: formData.notes,
    custom_answers: customAnswers,
  });
}

function dedupeGuestIds(guestIds: string[]): string[] {
  return Array.from(new Set(guestIds.filter(Boolean)));
}

function normalizeSelectedHouseholdGuestIds(guestIds: string[], household: HouseholdGuest[]): string[] {
  if (household.length === 0) return [];

  const invitedIds = new Set(household.map((member) => member.id));
  return dedupeGuestIds(guestIds).filter((guestId) => invitedIds.has(guestId));
}

function deriveSelectedHouseholdGuestIds(existingRsvp: ExistingRSVP | null, household: HouseholdGuest[]): string[] {
  if (household.length === 0) return [];

  const selectedFromRsvp = normalizeSelectedHouseholdGuestIds(existingRsvp?.guest_ids ?? [], household);

  return selectedFromRsvp.length > 0 ? selectedFromRsvp : dedupeGuestIds(household.map((member) => member.id));
}

function shouldApplyToHousehold(existingRsvp: ExistingRSVP | null, household: HouseholdGuest[], primaryGuestId?: string | null): boolean {
  if (household.length === 0) return false;
  if (!existingRsvp) return true;

  if (!Array.isArray(existingRsvp.guest_ids)) {
    return true;
  }

  const invitedIds = new Set(household.map((member) => member.id));
  return existingRsvp.guest_ids.some((guestId: string) => guestId !== primaryGuestId && invitedIds.has(guestId));
}

function buildNormalizedRsvpFormData(
  guest: Guest,
  existingRsvp: ExistingRSVP,
  mealConfig: RSVPMealConfig,
): { attending: boolean; attendCeremony: boolean; attendReception: boolean; meal_choice: string; plus_one_name: string; notes: string } {
  const parsed = parseEventSelectionsFromNotes(existingRsvp.notes, guest);
  const attendCeremony = typeof existingRsvp.attending_ceremony === 'boolean' ? existingRsvp.attending_ceremony : parsed.attendCeremony;
  const attendReception = typeof existingRsvp.attending_reception === 'boolean' ? existingRsvp.attending_reception : parsed.attendReception;

  return {
    attending: existingRsvp.attending,
    attendCeremony,
    attendReception,
    meal_choice: (() => {
      const current = existingRsvp.meal_choice || '';
      if (!current) return '';
      const match = mealConfig.options.find((opt) => opt.toLowerCase() === current.toLowerCase());
      return match ?? current;
    })(),
    plus_one_name: existingRsvp.plus_one_name || '',
    notes: parsed.cleanNotes,
  };
}

function invalidateRsvpSubmitState(
  activeSubmitRequestRef: React.MutableRefObject<number>,
  submitInFlightRef: React.MutableRefObject<boolean>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>,
) {
  activeSubmitRequestRef.current += 1;
  submitInFlightRef.current = false;
  setLoading(false);
  setSubmitting(false);
}


function parseEventSelectionsFromNotes(notes: string | null, guest: Guest): { cleanNotes: string; attendCeremony: boolean; attendReception: boolean } {
  const fallback = {
    cleanNotes: notes || '',
    attendCeremony: !!guest.invited_to_ceremony,
    attendReception: !!guest.invited_to_reception,
  };

  if (!notes) return fallback;

  const bracketMatch = notes.match(/\[Events\s+([^\]]+)\]/i);
  if (bracketMatch) {
    const eventPart = bracketMatch[1] || '';
    const map = Object.fromEntries(
      eventPart
        .split(/[;,+/&|]|\band\b|\bor\b/)
        .map((piece) => piece.trim())
        .filter(Boolean)
        .map((piece) => {
          const [k, v] = piece.split(/[:=]/).map((x) => (x || '').trim().toLowerCase());
          return [normalizeLegacyEventKey(k), parseLegacyEventAttendanceToken(v)];
        })
    ) as Record<string, boolean | undefined>;

    const cleanNotes = notes.replace(bracketMatch[0], '').trim();

    return {
      cleanNotes,
      attendCeremony: guest.invited_to_ceremony ? (map['ceremony'] ?? true) : false,
      attendReception: guest.invited_to_reception ? (map['reception'] ?? true) : false,
    };
  }

  const legacyMatch = notes.match(/^Attending events(?:\s*[:-])?\s+([^\r\n]+)(?:\r?\n([\s\S]*))?$/i);
  if (!legacyMatch) return fallback;

  const selectedEvents = new Set(
    legacyMatch[1]
      .split(/[,;+/&|]|\band\b|\bor\b/)
      .map((piece) => normalizeLegacyEventKey(piece))
      .filter(Boolean),
  );

  const attendCeremony = guest.invited_to_ceremony
    ? selectedEvents.has('ceremony')
    : false;
  const attendReception = guest.invited_to_reception
    ? selectedEvents.has('reception')
    : false;

  return {
    cleanNotes: (legacyMatch[2] || '').trim(),
    attendCeremony,
    attendReception,
  };
}



function getDemoMealConfig(): RSVPMealConfig {
  try {
    const raw = localStorage.getItem(DEMO_RSVP_MEAL_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] };
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
      options: Array.isArray(parsed.options) ? parsed.options.filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0) : ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'],
    };
  } catch {
    return { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] };
  }
}

function getDemoQuestions(): RSVPQuestion[] {
  try {
    const raw = localStorage.getItem(DEMO_RSVP_QUESTIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getDemoStoredResponses(): Record<string, ExistingRSVP> {
  try {
    const raw = localStorage.getItem(DEMO_RSVP_RESPONSES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return (parsed && typeof parsed === 'object') ? parsed as Record<string, ExistingRSVP> : {};
  } catch {
    return {};
  }
}

function mapDemoGuest(g: (typeof demoGuests)[number]): Guest {
  return {
    id: g.id,
    first_name: g.first_name ?? null,
    last_name: g.last_name ?? null,
    name: g.name,
    email: g.email ?? null,
    phone: null,
    group_name: null,
    wedding_site_id: g.wedding_site_id,
    plus_one_allowed: false,
    invited_to_ceremony: !!g.invited_to_ceremony,
    invited_to_reception: !!g.invited_to_reception,
    invite_token: g.invite_token ?? null,
  };
}

function demoLookup(searchValue: string): { guest: Guest | null; existingRsvp: ExistingRSVP | null; guests: Guest[] | null; rsvpDeadline: string | null; rsvpQuestions: RSVPQuestion[]; rsvpMealConfig: RSVPMealConfig; musicPlaylistUrl: string | null; householdGuests: HouseholdGuest[] } {
  const trimmed = searchValue.trim().toLowerCase();
  const questions = getDemoQuestions();
  const meal = getDemoMealConfig();
  const householdFor = (g: (typeof demoGuests)[number]): HouseholdGuest[] => demoGuests
    .filter((x) => x.household_id === g.household_id && x.id !== g.id)
    .map((x) => ({
      id: x.id,
      first_name: x.first_name ?? null,
      last_name: x.last_name ?? null,
      name: x.name,
      invite_token: x.invite_token ?? null,
      invited_to_ceremony: !!x.invited_to_ceremony,
      invited_to_reception: !!x.invited_to_reception,
    }));
  const stored = getDemoStoredResponses();

  const tokenMatch = demoGuests.find((g) => (g.invite_token || '').toLowerCase() === trimmed);
  if (tokenMatch) {
    const mapped = mapDemoGuest(tokenMatch);
    const existing = stored[tokenMatch.id] ?? (demoRSVPs.find((r) => r.guest_id === tokenMatch.id)
      ? {
          id: `demo-rsvp-${tokenMatch.id}`,
          attending: !!demoRSVPs.find((r) => r.guest_id === tokenMatch.id)?.attending,
          meal_choice: demoRSVPs.find((r) => r.guest_id === tokenMatch.id)?.meal_choice ?? null,
          plus_one_name: demoRSVPs.find((r) => r.guest_id === tokenMatch.id)?.plus_one_name ?? null,
          notes: demoRSVPs.find((r) => r.guest_id === tokenMatch.id)?.notes ?? null,
          custom_answers: null,
        }
      : null);
    return { guest: mapped, existingRsvp: existing ?? null, guests: null, rsvpDeadline: null, rsvpQuestions: questions, rsvpMealConfig: meal, musicPlaylistUrl: null, householdGuests: householdFor(tokenMatch) };
  }

  const matches = demoGuests.filter((g) => g.name.toLowerCase().includes(trimmed) || `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim().toLowerCase().includes(trimmed));
  if (matches.length === 0) return { guest: null, existingRsvp: null, guests: null, rsvpDeadline: null, rsvpQuestions: questions, rsvpMealConfig: meal, musicPlaylistUrl: null, householdGuests: [] };
  if (matches.length === 1) {
    const g = matches[0];
    const mapped = mapDemoGuest(g);
    const existing = stored[g.id] ?? (demoRSVPs.find((r) => r.guest_id === g.id)
      ? {
          id: `demo-rsvp-${g.id}`,
          attending: !!demoRSVPs.find((r) => r.guest_id === g.id)?.attending,
          meal_choice: demoRSVPs.find((r) => r.guest_id === g.id)?.meal_choice ?? null,
          plus_one_name: demoRSVPs.find((r) => r.guest_id === g.id)?.plus_one_name ?? null,
          notes: demoRSVPs.find((r) => r.guest_id === g.id)?.notes ?? null,
          custom_answers: null,
        }
      : null);
    return { guest: mapped, existingRsvp: existing ?? null, guests: null, rsvpDeadline: null, rsvpQuestions: questions, rsvpMealConfig: meal, musicPlaylistUrl: null, householdGuests: householdFor(g) };
  }

  return { guest: null, existingRsvp: null, guests: matches.slice(0, 10).map(mapDemoGuest), rsvpDeadline: null, rsvpQuestions: questions, rsvpMealConfig: meal, musicPlaylistUrl: null, householdGuests: [] };
}

export default function RSVP() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const siteSlug = searchParams.get('site')?.trim().toLowerCase() ?? '';
  const previewGuest = searchParams.get('previewGuest')?.trim() ?? '';
  const [step, setStep] = useState<'search' | 'pick' | 'form' | 'success'>('search');
  const [searchValue, setSearchValue] = useState('');
  const [guest, setGuest] = useState<Guest | null>(null);
  const [ambiguousGuests, setAmbiguousGuests] = useState<Guest[]>([]);
  const [existingRsvp, setExistingRsvp] = useState<ExistingRSVP | null>(null);
  const [rsvpDeadline, setRsvpDeadline] = useState<string | null>(null);
  const [musicPlaylistUrl, setMusicPlaylistUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tokenAutoLoading, setTokenAutoLoading] = useState(false);
  const [loadCycle, setLoadCycle] = useState(0);
  const activeLookupRequestRef = useRef(0);
  const activeSubmitRequestRef = useRef(0);
  const submitInFlightRef = useRef(false);
  const pendingContinuityRefreshRef = useRef(false);
  const ignoreNextLocalContinuityEventRef = useRef(false);
  const tokenLinkedSessionRef = useRef(false);
  const loadInFlightRef = useRef(false);
  const [activePredictionIndex, setActivePredictionIndex] = useState(-1);
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [rsvpQuestions, setRsvpQuestions] = useState<RSVPQuestion[]>([]);
  const [customAnswers, setCustomAnswers] = useState<Record<string, string | string[]>>({});
  const [mealConfig, setMealConfig] = useState<RSVPMealConfig>(DEFAULT_MEAL_CONFIG);
  const [householdGuests, setHouseholdGuests] = useState<HouseholdGuest[]>([]);
  const [applyToHousehold, setApplyToHousehold] = useState(true);
  const [selectedHouseholdGuestIds, setSelectedHouseholdGuestIds] = useState<string[]>([]);

  const invalidateActiveSubmit = useCallback(() => {
    invalidateRsvpSubmitState(activeSubmitRequestRef, submitInFlightRef, setLoading, setSubmitting);
  }, []);

  const invalidateSubmitFromEdit = useCallback(() => {
    invalidateActiveSubmit();
    setError('');
  }, [invalidateActiveSubmit]);

  const resetToSearch = useCallback((preserveToken = false) => {
    activeLookupRequestRef.current += 1;
    invalidateActiveSubmit();
    pendingContinuityRefreshRef.current = false;
    ignoreNextLocalContinuityEventRef.current = false;
    loadInFlightRef.current = false;
    setLoading(false);
    setSubmitting(false);
    setTokenAutoLoading(false);
    setStep('search');
    setActivePredictionIndex(-1);
    setError('');
    setGuest(null);
    setExistingRsvp(null);
    setAmbiguousGuests([]);
    setRsvpDeadline(null);
    setMusicPlaylistUrl(null);
    setFormData({ attending: true, attendCeremony: false, attendReception: false, meal_choice: '', plus_one_name: '', notes: '' });
    setCustomAnswers({});
    setRsvpQuestions([]);
    setMealConfig(DEFAULT_MEAL_CONFIG);
    setHouseholdGuests([]);
    setApplyToHousehold(true);
    setSelectedHouseholdGuestIds([]);
    setFormStep(1);
    setActivePredictionIndex(-1);
    tokenLinkedSessionRef.current = false;
    setSearchValue(preserveToken ? (searchParams.get('token') ?? '') : '');
    if (!preserveToken && searchParams.get('token')) {
      navigate('/rsvp', { replace: true });
    }
  }, [invalidateActiveSubmit, navigate, searchParams]);

  const [formData, setFormData] = useState({
    attending: true,
    attendCeremony: true,
    attendReception: true,
    meal_choice: '',
    plus_one_name: '',
    notes: '',
  });

  const activeToken = searchParams.get('token');

  const normalizedCurrentRsvpSnapshot = useMemo(() => {
    if (!guest) return null;
    const targetGuestIds = applyToHousehold
      ? dedupeGuestIds([guest.id, ...selectedHouseholdGuestIds])
      : [guest.id];

    return buildNormalizedExistingRsvp(formData, customAnswers, 'continuity', targetGuestIds);
  }, [applyToHousehold, customAnswers, formData, guest, selectedHouseholdGuestIds]);

  const normalizedBaselineRsvpSnapshot = useMemo(() => {
    if (!guest) return null;

    if (existingRsvp) {
      return {
        ...normalizeExistingRsvp(existingRsvp),
        id: 'continuity',
      };
    }

    const defaultGuestIds = householdGuests.length > 0
      ? dedupeGuestIds([guest.id, ...householdGuests.map((member) => member.id)])
      : [guest.id];

    return buildNormalizedExistingRsvp(
      {
        attending: true,
        attendCeremony: guest.invited_to_ceremony,
        attendReception: guest.invited_to_reception,
        meal_choice: mealConfig.enabled ? '' : '',
        plus_one_name: '',
        notes: '',
      },
      {},
      'continuity',
      defaultGuestIds,
    );
  }, [existingRsvp, guest, householdGuests, mealConfig]);

  const hasPendingLocalRsvpEdits = useMemo(() => {
    if (!normalizedCurrentRsvpSnapshot || !normalizedBaselineRsvpSnapshot) return false;

    return JSON.stringify(normalizedCurrentRsvpSnapshot) !== JSON.stringify(normalizedBaselineRsvpSnapshot);
  }, [normalizedBaselineRsvpSnapshot, normalizedCurrentRsvpSnapshot]);

  const returnToLoadedRsvp = useCallback(() => {
    invalidateActiveSubmit();
    if (!guest) {
      resetToSearch(true);
      return;
    }

    const selectedGuestIds = applyToHousehold
      ? dedupeGuestIds([guest.id, ...selectedHouseholdGuestIds])
      : [guest.id];
    const normalizedExistingRsvp = buildNormalizedExistingRsvp(formData, customAnswers, 'local-rsvp-confirmation', selectedGuestIds);
    const normalizedSelectedHouseholdGuestIds = normalizeSelectedHouseholdGuestIds(selectedHouseholdGuestIds, householdGuests);
    const shouldKeepHouseholdSelection = applyToHousehold && normalizedSelectedHouseholdGuestIds.length > 0;

    tokenLinkedSessionRef.current = !!activeToken && guest.invite_token === activeToken;
    setError('');
    setFormData(buildNormalizedRsvpFormData(guest, normalizedExistingRsvp, mealConfig));
    setCustomAnswers(normalizedExistingRsvp.custom_answers || {});
    setApplyToHousehold(shouldKeepHouseholdSelection);
    setSelectedHouseholdGuestIds(shouldKeepHouseholdSelection ? normalizedSelectedHouseholdGuestIds : []);
    setStep('form');
    setFormStep(1);
    setExistingRsvp(normalizedExistingRsvp);
  }, [activeToken, applyToHousehold, customAnswers, formData, guest, householdGuests, invalidateActiveSubmit, mealConfig, resetToSearch, selectedHouseholdGuestIds]);

  useEffect(() => {
    return () => {
      activeLookupRequestRef.current += 1;
      activeSubmitRequestRef.current += 1;
      loadInFlightRef.current = false;
    };
  }, []);

  const loadInvitationForToken = useCallback((token: string, { preserveVisibleState = false }: { preserveVisibleState?: boolean } = {}) => {
    if (!token) {
      activeLookupRequestRef.current += 1;
      activeSubmitRequestRef.current += 1;
      submitInFlightRef.current = false;
      pendingContinuityRefreshRef.current = false;
      ignoreNextLocalContinuityEventRef.current = false;
      tokenLinkedSessionRef.current = false;
      loadInFlightRef.current = false;
      setLoading(false);
      setTokenAutoLoading(false);
      setSubmitting(false);
      setSearchValue('');
      setStep('search');
      setGuest(null);
      setExistingRsvp(null);
      setAmbiguousGuests([]);
      setRsvpDeadline(null);
      setMusicPlaylistUrl(null);
      setRsvpQuestions([]);
      setMealConfig(DEFAULT_MEAL_CONFIG);
      setHouseholdGuests([]);
      setApplyToHousehold(true);
      setSelectedHouseholdGuestIds([]);
      setFormData({
        attending: true,
        attendCeremony: false,
        attendReception: false,
        meal_choice: '',
        plus_one_name: '',
        notes: '',
      });
      setCustomAnswers({});
      setFormStep(1);
      setActivePredictionIndex(-1);
      setError('');
      return;
    }
    const requestId = activeLookupRequestRef.current + 1;
    activeLookupRequestRef.current = requestId;
    activeSubmitRequestRef.current += 1;
    loadInFlightRef.current = true;
    submitInFlightRef.current = false;
    pendingContinuityRefreshRef.current = false;
    ignoreNextLocalContinuityEventRef.current = false;
    const shouldPreserveVisibleState = preserveVisibleState && tokenLinkedSessionRef.current;
    setLoading(false);
    setTokenAutoLoading(!shouldPreserveVisibleState);
    setSubmitting(false);
    if (!shouldPreserveVisibleState) {
      setStep('search');
      setError('');
      setSearchValue(token);
      setGuest(null);
      setExistingRsvp(null);
      setAmbiguousGuests([]);
      setRsvpDeadline(null);
      setMusicPlaylistUrl(null);
      setRsvpQuestions([]);
      setMealConfig(DEFAULT_MEAL_CONFIG);
      setHouseholdGuests([]);
      setApplyToHousehold(true);
      setSelectedHouseholdGuestIds([]);
      setCustomAnswers({});
      setFormData({ attending: true, attendCeremony: true, attendReception: true, meal_choice: '', plus_one_name: '', notes: '' });
      setFormStep(1);
      setActivePredictionIndex(-1);
    }
    (DEMO_MODE ? Promise.resolve({ data: demoLookup(token) as unknown, error: undefined as string | undefined }) : rsvpCall({ action: 'lookup', searchValue: token }))
      .then(({ data, error: err }) => {
        if (activeLookupRequestRef.current !== requestId) return;
        if (err || !data) {
          if (shouldPreserveVisibleState) {
            tokenLinkedSessionRef.current = true;
            return;
          }
          tokenLinkedSessionRef.current = false;
          setError(err ?? 'Invitation not recognized. Please search by name below.');
          setTokenAutoLoading(false);
          return;
        }
        const result = data as { guest: Guest | null; existingRsvp: ExistingRSVP | null; guests: Guest[] | null; rsvpDeadline: string | null; rsvpQuestions?: RSVPQuestion[] | null; rsvpMealConfig?: RSVPMealConfig | null; musicPlaylistUrl?: string | null; householdGuests?: HouseholdGuest[] | null };
        if (result.guest) {
          selectGuest(result.guest, result.existingRsvp, result.rsvpDeadline, result.rsvpQuestions ?? [], result.rsvpMealConfig ?? { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] }, result.householdGuests ?? [], result.musicPlaylistUrl ?? null, 'token');
        } else if (result.guests && result.guests.length === 1) {
          selectGuest(result.guests[0], result.existingRsvp, result.rsvpDeadline, result.rsvpQuestions ?? [], result.rsvpMealConfig ?? { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] }, result.householdGuests ?? [], result.musicPlaylistUrl ?? null, 'token');
        } else if (result.guests && result.guests.length > 1) {
          if (shouldPreserveVisibleState) {
            tokenLinkedSessionRef.current = true;
            return;
          }
          tokenLinkedSessionRef.current = false;
          setAmbiguousGuests(result.guests);
          setRsvpDeadline(result.rsvpDeadline);
          setRsvpQuestions(result.rsvpQuestions ?? []);
          setMealConfig(result.rsvpMealConfig ?? { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] });
          setMusicPlaylistUrl(result.musicPlaylistUrl ?? null);
          const hh = result.householdGuests ?? [];
          setHouseholdGuests(hh);
          setApplyToHousehold(hh.length > 0);
          setSelectedHouseholdGuestIds(hh.map((h) => h.id));
          setStep('pick');
        } else {
          if (shouldPreserveVisibleState) {
            tokenLinkedSessionRef.current = true;
            return;
          }
          tokenLinkedSessionRef.current = false;
          setError('Invitation not recognized. Please search by name below.');
        }
      })
      .catch(() => {
        if (activeLookupRequestRef.current !== requestId) return;
        if (shouldPreserveVisibleState) {
          tokenLinkedSessionRef.current = true;
          return;
        }
        tokenLinkedSessionRef.current = false;
        setError('Failed to load invitation. Please search by name below.');
      })
      .finally(() => {
        if (activeLookupRequestRef.current !== requestId) return;
        loadInFlightRef.current = false;
        setTokenAutoLoading(false);
        setLoadCycle((cycle) => cycle + 1);
      });
  }, []);

  const refreshTokenLinkedRsvpForContinuity = useCallback(() => {
    if (!activeToken || !tokenLinkedSessionRef.current) return;
    if (step === 'success' || loadInFlightRef.current || loading || tokenAutoLoading || submitting || submitInFlightRef.current || hasPendingLocalRsvpEdits) {
      pendingContinuityRefreshRef.current = true;
      return;
    }

    pendingContinuityRefreshRef.current = false;
    loadInvitationForToken(activeToken, { preserveVisibleState: true });
  }, [activeToken, hasPendingLocalRsvpEdits, loadInvitationForToken, loading, step, submitting, tokenAutoLoading]);

  useEffect(() => {
    loadInvitationForToken(activeToken ?? '');
  }, [activeToken, loadInvitationForToken]);

  useEffect(() => {
    if (!activeToken) return undefined;

    const handleRsvpContinuityUpdate = () => {
      if (ignoreNextLocalContinuityEventRef.current) {
        ignoreNextLocalContinuityEventRef.current = false;
        return;
      }
      refreshTokenLinkedRsvpForContinuity();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== RSVP_CONTINUITY_STORAGE_KEY || !event.newValue) return;
      refreshTokenLinkedRsvpForContinuity();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      refreshTokenLinkedRsvpForContinuity();
    };

    window.addEventListener('focus', refreshTokenLinkedRsvpForContinuity);
    window.addEventListener(RSVP_CONTINUITY_EVENT, handleRsvpContinuityUpdate);
    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', refreshTokenLinkedRsvpForContinuity);
      window.removeEventListener(RSVP_CONTINUITY_EVENT, handleRsvpContinuityUpdate);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeToken, refreshTokenLinkedRsvpForContinuity]);

  useEffect(() => {
    if (!pendingContinuityRefreshRef.current || !activeToken || !tokenLinkedSessionRef.current) return;
    if (step === 'success' || loadInFlightRef.current || loading || tokenAutoLoading || submitting || submitInFlightRef.current || hasPendingLocalRsvpEdits) return;

    pendingContinuityRefreshRef.current = false;
    loadInvitationForToken(activeToken, { preserveVisibleState: true });
  }, [activeToken, hasPendingLocalRsvpEdits, loadCycle, loadInvitationForToken, loading, step, submitting, tokenAutoLoading]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const requestId = activeLookupRequestRef.current + 1;
    activeLookupRequestRef.current = requestId;
    invalidateActiveSubmit();
    pendingContinuityRefreshRef.current = false;
    ignoreNextLocalContinuityEventRef.current = false;
    tokenLinkedSessionRef.current = false;
    setTokenAutoLoading(false);
    setLoading(true);
    setSubmitting(false);
    setActivePredictionIndex(-1);
    setError('');
    setStep('search');
    setGuest(null);
    setExistingRsvp(null);
    setAmbiguousGuests([]);
    setRsvpDeadline(null);
    setMusicPlaylistUrl(null);
    setFormData({ attending: true, attendCeremony: false, attendReception: false, meal_choice: '', plus_one_name: '', notes: '' });
    setCustomAnswers({});
    setRsvpQuestions([]);
    setMealConfig(DEFAULT_MEAL_CONFIG);
    setHouseholdGuests([]);
    setApplyToHousehold(true);
    setSelectedHouseholdGuestIds([]);
    setFormStep(1);

    try {
      const lookupResp: { data?: unknown; error?: string } = DEMO_MODE
        ? { data: demoLookup(searchValue.trim()) as unknown }
        : await rsvpCall({ action: 'lookup', searchValue: searchValue.trim() });
      const data = lookupResp.data;
      const err = lookupResp.error;
      if (err) {
        if (activeLookupRequestRef.current !== requestId) return;
        setError(err);
        return;
      }
      if (!data) {
        if (activeLookupRequestRef.current !== requestId) return;
        setError('Invitation not recognized. Please search by name below.');
        return;
      }

      const result = data as { guest: Guest | null; existingRsvp: ExistingRSVP | null; guests: Guest[] | null; rsvpDeadline: string | null; rsvpQuestions?: RSVPQuestion[] | null; rsvpMealConfig?: RSVPMealConfig | null; musicPlaylistUrl?: string | null; householdGuests?: HouseholdGuest[] | null };

      if (result.guests && result.guests.length > 1) {
        if (activeLookupRequestRef.current !== requestId) return;
        setAmbiguousGuests(result.guests);
        setRsvpDeadline(result.rsvpDeadline);
        setRsvpQuestions(result.rsvpQuestions ?? []);
        setMealConfig(result.rsvpMealConfig ?? { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] });
        setMusicPlaylistUrl(result.musicPlaylistUrl ?? null);
        const hh = result.householdGuests ?? [];
        setHouseholdGuests(hh);
        setApplyToHousehold(hh.length > 0);
        setSelectedHouseholdGuestIds(hh.map((h) => h.id));
        setStep('pick');
        return;
      }

      if (result.guests && result.guests.length === 1) {
        if (activeLookupRequestRef.current !== requestId) return;
        selectGuest(result.guests[0], result.existingRsvp, result.rsvpDeadline, result.rsvpQuestions ?? [], result.rsvpMealConfig ?? { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] }, result.householdGuests ?? [], result.musicPlaylistUrl ?? null);
        return;
      }

      if (!result.guest) {
        if (activeLookupRequestRef.current !== requestId) return;
        setError('Invitation not recognized. Please search by name below.');
        return;
      }

      const foundGuest = result.guest;
      if (activeLookupRequestRef.current !== requestId) return;
      selectGuest(foundGuest, result.existingRsvp, result.rsvpDeadline, result.rsvpQuestions ?? [], result.rsvpMealConfig ?? { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] }, result.householdGuests ?? [], result.musicPlaylistUrl ?? null);
    } catch {
      if (activeLookupRequestRef.current !== requestId) return;
      setError('An error occurred. Please try again.');
    } finally {
      if (activeLookupRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  function selectGuest(foundGuest: Guest, foundRsvp: ExistingRSVP | null, deadline: string | null = null, questions: RSVPQuestion[] = [], meal: RSVPMealConfig = { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] }, household: HouseholdGuest[] = [], playlistUrl: string | null = null, source: 'manual' | 'token' = 'manual') {
    const normalizedRsvp = foundRsvp ? normalizeExistingRsvp(foundRsvp) : null;
    tokenLinkedSessionRef.current = source === 'token';
    setGuest(foundGuest);
    setFormStep(1);
    setActivePredictionIndex(-1);
    setRsvpDeadline(deadline);
    setRsvpQuestions(questions);
    setMealConfig(meal);
    setMusicPlaylistUrl(playlistUrl);
    const selectedGuestIds = deriveSelectedHouseholdGuestIds(normalizedRsvp, household);
    const applyToSelectedHousehold = normalizedRsvp
      ? shouldApplyToHousehold(normalizedRsvp, household, foundGuest.id)
      : household.length > 0;
    setHouseholdGuests(household);
    setApplyToHousehold(applyToSelectedHousehold);
    setSelectedHouseholdGuestIds(applyToSelectedHousehold ? selectedGuestIds : []);
    if (normalizedRsvp) {
      setExistingRsvp(normalizedRsvp);
      setFormData(buildNormalizedRsvpFormData(foundGuest, normalizedRsvp, meal));
      setCustomAnswers(
        normalizedRsvp.custom_answers && typeof normalizedRsvp.custom_answers === 'object'
          ? normalizeCustomAnswers(normalizedRsvp.custom_answers as Record<string, string | string[]>)
          : {},
      );
    }
    if (!normalizedRsvp) {
      setExistingRsvp(null);
      setFormData({
        attending: true,
        attendCeremony: !!foundGuest.invited_to_ceremony,
        attendReception: !!foundGuest.invited_to_reception,
        meal_choice: '',
        plus_one_name: '',
        notes: '',
      });
      setCustomAnswers({});
    }
    setFormStep(1);
    setStep('form');
  }

  const handlePickGuest = async (picked: Guest) => {
    const pickedLookupValue = picked.invite_token ?? picked.id;
    const requestId = activeLookupRequestRef.current + 1;
    activeLookupRequestRef.current = requestId;
    invalidateActiveSubmit();
    setLoading(true);
    setSubmitting(false);
    setActivePredictionIndex(-1);
    setError('');
    setStep('search');
    setSearchValue(picked.invite_token ?? guestLabel(picked));
    setAmbiguousGuests([]);
    setGuest(null);
    setExistingRsvp(null);
    setRsvpDeadline(null);
    setMusicPlaylistUrl(null);
    setFormData({ attending: true, attendCeremony: false, attendReception: false, meal_choice: '', plus_one_name: '', notes: '' });
    setCustomAnswers({});
    setRsvpQuestions([]);
    setMealConfig(DEFAULT_MEAL_CONFIG);
    setFormStep(1);
    setHouseholdGuests([]);
    setApplyToHousehold(true);
    setSelectedHouseholdGuestIds([]);
    try {
      const lookupResp: { data?: unknown; error?: string } = DEMO_MODE
        ? { data: demoLookup(pickedLookupValue) as unknown }
        : await rsvpCall({ action: 'lookup', searchValue: pickedLookupValue });
      const data = lookupResp.data;
      const err = lookupResp.error;
      if (err || !data) {
        if (activeLookupRequestRef.current !== requestId) return;
        selectGuest(picked, null, null, [], DEFAULT_MEAL_CONFIG, [], null);
        return;
      }
      const result = data as { guest: Guest | null; existingRsvp: ExistingRSVP | null; guests: Guest[] | null; rsvpDeadline: string | null; rsvpQuestions?: RSVPQuestion[] | null; rsvpMealConfig?: RSVPMealConfig | null; musicPlaylistUrl?: string | null; householdGuests?: HouseholdGuest[] | null };
      if (activeLookupRequestRef.current !== requestId) return;
      const resolvedGuest = result.guest
        ?? (result.guests && result.guests.length === 1 ? result.guests[0] : null)
        ?? picked;
      selectGuest(resolvedGuest, result.existingRsvp, result.rsvpDeadline, result.rsvpQuestions ?? [], result.rsvpMealConfig ?? { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] }, result.householdGuests ?? [], result.musicPlaylistUrl ?? null);
    } catch {
      if (activeLookupRequestRef.current !== requestId) return;
      selectGuest(picked, null, null, [], DEFAULT_MEAL_CONFIG, [], null);
    } finally {
      if (activeLookupRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitInFlightRef.current) return;
    const requestId = activeSubmitRequestRef.current + 1;
    activeSubmitRequestRef.current = requestId;
    submitInFlightRef.current = true;
    setLoading(true);
    setSubmitting(true);
    setError('');

    try {
      if (!guest) return;

      if (deadlinePassed && !existingRsvp) {
        if (activeSubmitRequestRef.current !== requestId) return;
        setError('The RSVP deadline has passed. Please contact the couple directly if you still need to respond.');
        return;
      }

      if (!guest.invite_token) {
        if (activeSubmitRequestRef.current !== requestId) return;
        setError(RSVP_MISSING_INVITATION_DETAIL_ERROR);
        return;
      }

      if (formData.attending && guest.invited_to_ceremony && guest.invited_to_reception && !formData.attendCeremony && !formData.attendReception) {
        if (activeSubmitRequestRef.current !== requestId) return;
        setError('Please choose at least one event from your invitation, or mark not attending.');
        return;
      }

      const notesPayload = (formData.notes || '').trim();
      const mealChoice = (formData.meal_choice || '').trim();
      const plusOneName = (formData.plus_one_name || '').trim();
      const normalizedCustomAnswers = normalizeCustomAnswers(customAnswers);

      if (applyToHousehold && householdGuests.length > 0 && selectedHouseholdGuestIds.length === 0) {
        if (activeSubmitRequestRef.current !== requestId) return;
        setError('Pick at least one household guest to share this RSVP with, or turn inheritance off.');
        return;
      }

      if (DEMO_MODE) {
        const stored = getDemoStoredResponses();
        const targetIds = applyToHousehold ? dedupeGuestIds([guest.id, ...selectedHouseholdGuestIds]) : [guest.id];
        const payload = buildNormalizedExistingRsvp(formData, customAnswers, `demo-rsvp-${guest.id}`, targetIds);
        const normalizedSelectedHouseholdGuestIds = normalizeSelectedHouseholdGuestIds(targetIds.filter((id) => id !== guest.id), householdGuests);
        const submitSource = tokenLinkedSessionRef.current && activeToken === guest.invite_token ? 'token' : 'manual';
        targetIds.forEach((id) => { stored[id] = { ...payload, id: `demo-rsvp-${id}` }; });
        localStorage.setItem(DEMO_RSVP_RESPONSES_KEY, JSON.stringify(stored));
        if (activeSubmitRequestRef.current !== requestId) return;
        selectGuest(guest, payload, rsvpDeadline, rsvpQuestions, mealConfig, householdGuests, musicPlaylistUrl, submitSource);
        setApplyToHousehold(applyToHousehold && normalizedSelectedHouseholdGuestIds.length > 0);
        setSelectedHouseholdGuestIds(applyToHousehold ? normalizedSelectedHouseholdGuestIds : []);
        ignoreNextLocalContinuityEventRef.current = true;
        notifyRsvpContinuityUpdate();
        setStep('success');
        return;
      }

      const targetGuestIds = applyToHousehold
        ? dedupeGuestIds([guest.id, ...selectedHouseholdGuestIds])
        : [guest.id];

      const { data, error: err } = await rsvpCall({
        action: 'submit',
        guestId: guest.id,
        inviteToken: guest.invite_token,
        attending: formData.attending,
        attendCeremony: formData.attendCeremony,
        attendReception: formData.attendReception,
        mealChoice: mealChoice || null,
        plusOneName: plusOneName || null,
        plusOneCount: plusOneName ? 1 : 0,
        childrenCount: 0,
        notes: notesPayload || null,
        customAnswers: normalizedCustomAnswers,
        applyToHousehold,
        targetGuestIds,
      });

      const submitSucceeded = !!(data && typeof data === 'object' && 'success' in data && (data as { success?: boolean }).success);

      if (err || !submitSucceeded) {
        if (activeSubmitRequestRef.current !== requestId) return;
        setError(err || 'Failed to submit RSVP. Please try again.');
        return;
      }

      if (activeSubmitRequestRef.current !== requestId) return;
      const normalizedExistingRsvp = buildNormalizedExistingRsvp(formData, customAnswers, existingRsvp?.id ?? 'submitted-rsvp', targetGuestIds);
      const normalizedSelectedHouseholdGuestIds = normalizeSelectedHouseholdGuestIds(targetGuestIds.filter((id) => id !== guest.id), householdGuests);
      const submitSource = tokenLinkedSessionRef.current && activeToken === guest.invite_token ? 'token' : 'manual';
      selectGuest(guest, normalizedExistingRsvp, rsvpDeadline, rsvpQuestions, mealConfig, householdGuests, musicPlaylistUrl, submitSource);
      setApplyToHousehold(applyToHousehold && normalizedSelectedHouseholdGuestIds.length > 0);
      setSelectedHouseholdGuestIds(applyToHousehold ? normalizedSelectedHouseholdGuestIds : []);
      ignoreNextLocalContinuityEventRef.current = true;
      notifyRsvpContinuityUpdate();
      setStep('success');
    } catch {
      if (activeSubmitRequestRef.current !== requestId) return;
      setError('Failed to submit RSVP. Please try again.');
    } finally {
      if (activeSubmitRequestRef.current === requestId) {
        submitInFlightRef.current = false;
        setLoading(false);
        setSubmitting(false);
      }
    }
  };

  const guestDisplayName = guest
    ? guest.first_name && guest.last_name
      ? `${guest.first_name} ${guest.last_name}`
      : guest.name
    : '';

  const deadlinePassed = isRsvpDeadlinePassed(rsvpDeadline);

  const canSubmit = !!guest?.invite_token && !(deadlinePassed && !existingRsvp);


  useEffect(() => {
    setActivePredictionIndex(-1);
  }, [searchValue]);

  const guestPredictions = useMemo(() => {
    if (!DEMO_MODE) return [] as string[];
    const q = searchValue.trim().toLowerCase();
    if (q.length < 2) return [] as string[];
    return demoGuests
      .map((g) => g.name)
      .filter((name, idx, arr) => arr.indexOf(name) === idx)
      .filter((name) => name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [searchValue]);

  const updateFormData = useCallback((updater: (current: typeof formData) => typeof formData) => {
    invalidateSubmitFromEdit();
    setFormData((current) => updater(current));
  }, [invalidateSubmitFromEdit]);

  const updateCustomAnswers = useCallback((updater: (current: Record<string, string | string[]>) => Record<string, string | string[]>) => {
    invalidateSubmitFromEdit();
    setCustomAnswers((current) => updater(current));
  }, [invalidateSubmitFromEdit]);

  const updateApplyToHousehold = useCallback((nextValue: boolean) => {
    invalidateSubmitFromEdit();
    setApplyToHousehold(nextValue);
    if (!nextValue) {
      setSelectedHouseholdGuestIds([]);
    }
  }, [invalidateSubmitFromEdit]);

  const updateSelectedHouseholdGuestIds = useCallback((updater: (current: string[]) => string[]) => {
    invalidateSubmitFromEdit();
    setSelectedHouseholdGuestIds((current) => updater(current));
  }, [invalidateSubmitFromEdit]);


  const goToNextFormStep = () => {
    if (formStep === 1) {
      if (formData.attending && guest && !guest.invited_to_ceremony && !guest.invited_to_reception) {
        setError('You are marked attending, but no event invitations are enabled for this guest.');
        return;
      }
      setError('');
      setFormStep(2);
      return;
    }

    if (formStep === 2) {
      if (formData.attending && guest?.invited_to_ceremony && guest?.invited_to_reception && !formData.attendCeremony && !formData.attendReception) {
        setError('Please select at least one event before continuing.');
        return;
      }
      if (formData.attending && mealConfig.enabled && !formData.meal_choice) {
        setError('Please choose a meal option before review.');
        return;
      }

      const requiredMissing = rsvpQuestions
        .filter((q) => q.required)
        .filter((q) => (q.appliesTo ?? 'all') === 'all' || ((q.appliesTo === 'ceremony' && formData.attendCeremony) || (q.appliesTo === 'reception' && formData.attendReception)))
        .find((q) => {
          const v = customAnswers[q.id];
          if (Array.isArray(v)) return v.length === 0;
          return !(v || '').toString().trim();
        });

      if (requiredMissing) {
        setError(`Please answer: ${getRequiredQuestionValidationLabel(requiredMissing)}`);
        return;
      }
      setError('');
      setFormStep(3);
    }
  };
  const availableMealValues = useMemo(() => new Set(mealConfig.options.map((o) => o.toLowerCase())), [mealConfig.options]);

  useEffect(() => {
    if (!mealConfig.enabled) {
      if (formData.meal_choice) setFormData((prev) => ({ ...prev, meal_choice: '' }));
      return;
    }
    if (formData.meal_choice && !availableMealValues.has(formData.meal_choice.toLowerCase())) {
      setFormData((prev) => ({ ...prev, meal_choice: '' }));
    }
  }, [mealConfig.enabled, availableMealValues, formData.meal_choice]);

  const invitedEvents = [
    guest?.invited_to_ceremony ? 'Ceremony' : null,
    guest?.invited_to_reception ? 'Reception' : null,
  ].filter(Boolean) as string[];

  const inheritedHouseholdMembers = useMemo(
    () => householdGuests.filter((h) => selectedHouseholdGuestIds.includes(h.id)),
    [householdGuests, selectedHouseholdGuestIds]
  );

  if (tokenAutoLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Loading your invitation…</p>
          <button
            type="button"
            onClick={() => resetToSearch(false)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Search by name instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50">
      <div className="flex justify-end px-6 pt-4">
        <LanguageSwitcher />
      </div>
      <div className="container mx-auto px-4 pb-14 max-w-2xl">
        {step === 'search' && (
          <Card className="p-5 md:p-7">
            <div className="text-center mb-6">
              <h1 className="text-2xl md:text-3xl font-serif mb-2">{t('rsvp.title')}</h1>
              <p className="text-gray-600">{t('rsvp.subtitle')}</p>
            </div>

            <form onSubmit={handleSearch} className="space-y-4.5">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('rsvp.search_label')}
                </label>
                <Input
                  type="text"
                  value={searchValue}
                  onChange={(e) => {
                    if (loading) {
                      activeLookupRequestRef.current += 1;
                      setLoading(false);
                      setSubmitting(false);
                    }
                    setError('');
                    setActivePredictionIndex(-1);
                    setSearchValue(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (guestPredictions.length === 0) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setActivePredictionIndex((idx) => (idx + 1) % guestPredictions.length);
                      return;
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setActivePredictionIndex((idx) => (idx <= 0 ? guestPredictions.length - 1 : idx - 1));
                      return;
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setActivePredictionIndex(-1);
                      return;
                    }
                    if (e.key === 'Enter' && activePredictionIndex >= 0) {
                      e.preventDefault();
                      if (loading) {
                        activeLookupRequestRef.current += 1;
                        setLoading(false);
                        setSubmitting(false);
                      }
                      setError('');
                      setActivePredictionIndex(-1);
                      setSearchValue(guestPredictions[activePredictionIndex]);
                    }
                  }}
                  placeholder={t('rsvp.search_placeholder')}
                  className="h-11"
                  required
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Use the code from your invitation email for the fastest lookup.
                </p>
                {guestPredictions.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg bg-white overflow-hidden">
                    {guestPredictions.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          if (loading) {
                            activeLookupRequestRef.current += 1;
                            setLoading(false);
                            setSubmitting(false);
                          }
                          setError('');
                          setActivePredictionIndex(-1);
                          setSearchValue(name);
                        }}
                        onMouseEnter={() => setActivePredictionIndex(guestPredictions.indexOf(name))}
                        className={`w-full text-left px-3 py-2 text-sm ${guestPredictions[activePredictionIndex] === name ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                  <ul className="pl-6 space-y-1 text-xs text-red-600 list-disc">
                    <li>Make sure you're using the invitation link from your email</li>
                    <li>Try searching by your first and last name</li>
                    <li>Check the spelling matches what the couple has on file</li>
                    <li>Contact the couple if you're still having trouble</li>
                  </ul>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full h-11">
                {loading ? 'Searching…' : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Find My Invitation
                  </>
                )}
              </Button>
            </form>
          </Card>
        )}

        {step === 'pick' && (
          <Card className="p-5 md:p-7">
            <div className="text-center mb-5">
              <h1 className="text-xl md:text-2xl font-serif mb-2">Multiple matches found</h1>
              <p className="text-gray-600 text-sm">
                We found {ambiguousGuests.length} guests with that name. Please select yourself below.
              </p>
            </div>

            <div className="space-y-2.5 mb-5">
              {ambiguousGuests.map((g) => {
                const hints: string[] = [];
                if (g.last_name) hints.push(g.last_name);
                if (g.group_name) hints.push(g.group_name);
                if (g.email) hints.push(maskEmail(g.email));
                if (g.phone) hints.push(`ends in ${g.phone.slice(-4)}`);
                const invitedTo = [
                  g.invited_to_ceremony && 'Ceremony',
                  g.invited_to_reception && 'Reception',
                ].filter(Boolean).join(' + ');
                return (
                  <button
                    key={g.id}
                    onClick={() => handlePickGuest(g)}
                    disabled={loading}
                    className="w-full flex items-center gap-3 p-3.5 border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-colors text-left group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-rose-100 flex items-center justify-center flex-shrink-0 transition-colors">
                      <User className="w-5 h-5 text-gray-500 group-hover:text-rose-500 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{guestLabel(g)}</p>
                      {hints.length > 0 && (
                        <p className="text-sm text-gray-500 truncate">{hints.join(' · ')}</p>
                      )}
                      {invitedTo && (
                        <p className="text-xs text-gray-400 mt-0.5">{invitedTo}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => { resetToSearch(false); }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Search again
            </button>
          </Card>
        )}

        {step === 'form' && guest && (
          <Card className="p-5 md:p-7">
            <div className="text-center mb-6">
              <h1 className="text-2xl md:text-3xl font-serif mb-2">Welcome, {guestDisplayName}!</h1>
              {existingRsvp && (
                <p className="text-sm text-gray-600">
                  You've already responded. You can update your response below.
                </p>
              )}
            </div>

            {deadlinePassed && !existingRsvp && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">RSVP deadline has passed</p>
                  <p className="mt-0.5">The deadline was {formatRsvpDeadline(rsvpDeadline)}. Please contact the couple directly.</p>
                </div>
              </div>
            )}

            {existingRsvp && (
              <>
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-sm space-y-1">
                  <p className="font-medium">We have your current RSVP on file.</p>
                  <p>You can review or update your details here. If plans change later, use this same link again.</p>
                </div>
                <div className="mb-6 p-4 bg-surface-subtle/40 border border-border-subtle rounded-lg text-text-secondary text-sm space-y-1">
                  <p className="font-medium text-text-primary">Check back here for updates</p>
                  <p>The couple may refine timing, travel notes, or day-of details later. This same RSVP link will still bring you back to the right place.</p>
                </div>
              </>
            )}

            <GuestJourneyCompanion
              currentSurface="rsvp"
              siteSlug={siteSlug || undefined}
              inviteToken={activeToken || undefined}
              previewGuest={previewGuest || undefined}
              completedSurfaces={existingRsvp ? ['rsvp'] : []}
              className="mb-6"
            />

            {deadlinePassed && existingRsvp && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                The RSVP deadline has passed, but you can still update your existing response.
              </div>
            )}

            {!guest.invite_token && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-base space-y-2">
                <div className="flex items-start gap-2 font-medium">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  Can't submit — missing invitation link
                </div>
                <p className="pl-7 text-sm text-amber-900/90">To RSVP, open the invitation email you received and click the RSVP button. That link contains a secure code required to submit your response.</p>
              </div>
            )}

            <div className="mb-5 p-4 bg-surface-subtle/40 border border-border-subtle rounded-2xl">
              <div className="flex items-center gap-2 text-xs">
                {[1, 2, 3].map((n) => (
                  <div key={n} className={`flex items-center gap-2 ${n < 3 ? 'flex-1' : ''}`}>
                    <div className={`w-6 h-6 rounded-full grid place-items-center font-semibold ${formStep >= n ? 'bg-rose-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{n}</div>
                    {n < 3 && <div className={`h-0.5 flex-1 ${formStep > n ? 'bg-rose-400' : 'bg-gray-200'}`} />}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-gray-600">{formStep === 1 ? 'Step 1: Attendance' : formStep === 2 ? 'Step 2: Details' : 'Step 3: Final review & submit'} · {Math.round((formStep / 3) * 100)}% complete</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {formStep === 1 && (
                <>
                  <div>
                    <label className="block text-base font-semibold mb-2">Will you be attending?</label>
                    <Select
                      value={formData.attending ? 'yes' : 'no'}
                      onChange={(e) => updateFormData((current) => ({ ...current, attending: e.target.value === 'yes' }))}
                      className="h-12 text-base"
                      required
                      options={[
                        { value: 'yes', label: "Yes, I'll be there!" },
                        { value: 'no', label: "Sorry, I can't make it" },
                      ]}
                    />
                  </div>

                  {invitedEvents.length > 0 && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm">
                      <p className="font-semibold mb-1.5 text-base text-gray-900">Your event access details</p>
                      <ul className="list-disc list-inside space-y-1.5 text-base text-gray-800">
                        {invitedEvents.map((ev) => <li key={ev}>{ev}</li>)}
                      </ul>
                    </div>
                  )}
                  {householdGuests.length > 0 && (
                    <div className="text-sm p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                      <label className="flex items-start gap-3">
                        <input type="checkbox" checked={applyToHousehold} onChange={(e) => updateApplyToHousehold(e.target.checked)} className="w-5 h-5 mt-0.5" />
                        <span className="font-semibold text-base text-gray-900">Inherit this RSVP to selected household guests</span>
                      </label>

                      {applyToHousehold && (
                        <details className="rounded-xl border border-amber-200 bg-white/60 p-3">
                          <summary className="cursor-pointer text-sm font-semibold text-amber-900 flex items-center justify-between gap-2">
                            <span>Choose household guests</span>
                            <span className="text-xs text-amber-800">{selectedHouseholdGuestIds.length}/{householdGuests.length} selected</span>
                          </summary>
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => updateSelectedHouseholdGuestIds(() => householdGuests.map((h) => h.id))}
                                className="text-xs px-3 py-2 rounded-lg border border-amber-300 text-amber-900 hover:bg-amber-100"
                              >
                                Select all
                              </button>
                              <button
                                type="button"
                                onClick={() => updateSelectedHouseholdGuestIds(() => [])}
                                className="text-xs px-3 py-2 rounded-lg border border-amber-300 text-amber-900 hover:bg-amber-100"
                              >
                                Clear
                              </button>
                            </div>
                            <div className="space-y-1.5">
                              {householdGuests.map((h) => {
                                const label = h.first_name && h.last_name ? `${h.first_name} ${h.last_name}` : h.name;
                                const checked = selectedHouseholdGuestIds.includes(h.id);
                                const access = [h.invited_to_ceremony ? 'Ceremony' : null, h.invited_to_reception ? 'Reception' : null].filter(Boolean).join(' + ') || 'No event access';
                                return (
                                  <label key={h.id} className="flex items-center justify-between gap-3 bg-white border border-amber-200 rounded-lg px-3 py-2.5">
                                    <span className="text-sm text-gray-800 font-medium">{label}</span>
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs text-gray-600">{access}</span>
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                          updateSelectedHouseholdGuestIds((prev) => e.target.checked ? [...new Set([...prev, h.id])] : prev.filter((id) => id !== h.id));
                                        }}
                                        className="w-5 h-5"
                                      />
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </>
              )}

              {formStep === 2 && (
                <>
                  {formData.attending && (
                    <>
                      {(guest.invited_to_ceremony || guest.invited_to_reception) && (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-4">
                          <div className="space-y-1.5">
                            <p className="text-base font-semibold text-gray-900">Which events will you attend?</p>
                            <p className="text-sm text-gray-600">Choose the parts of the celebration you're joining.</p>
                          </div>
                          {guest.invited_to_ceremony && (
                            <label className="flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm">
                              <span className="text-base font-medium text-gray-900">Wedding Ceremony</span>
                              <input
                                type="checkbox"
                                checked={formData.attendCeremony}
                                onChange={(e) => updateFormData((current) => ({ ...current, attendCeremony: e.target.checked }))}
                                className="w-5 h-5"
                              />
                            </label>
                          )}
                          {guest.invited_to_reception && (
                            <label className="flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm">
                              <span className="text-base font-medium text-gray-900">Reception</span>
                              <input
                                type="checkbox"
                                checked={formData.attendReception}
                                onChange={(e) => updateFormData((current) => ({ ...current, attendReception: e.target.checked }))}
                                className="w-5 h-5"
                              />
                            </label>
                          )}
                          <p className="text-sm text-gray-600">Your event choices will be saved with your RSVP.</p>
                        </div>
                      )}

                      {mealConfig.enabled && (
                        <div>
                          <label className="block text-base font-semibold mb-2">Meal choice</label>
                          <Select
                            value={formData.meal_choice}
                            onChange={(e) => updateFormData((current) => ({ ...current, meal_choice: e.target.value }))}
                            className="h-12 text-base"
                            options={[
                              { value: '', label: 'Select a meal option' },
                              ...mealConfig.options.map((opt) => ({ value: opt, label: opt })),
                            ]}
                          />
                        </div>
                      )}

                      {guest.plus_one_allowed && (
                        <div>
                          <label className="block text-base font-semibold mb-2">
                            Plus-one name (optional)
                          </label>
                          <Input
                            type="text"
                            value={formData.plus_one_name}
                            onChange={(e) => updateFormData((current) => ({ ...current, plus_one_name: e.target.value }))}
                            placeholder="Plus-one full name"
                            className="h-12 text-base"
                          />
                          <p className="text-sm text-gray-600 mt-2">You're welcome to bring a guest.</p>
                        </div>
                      )}
                    </>
                  )}


                  {musicPlaylistUrl && (
                    <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl">
                      <p className="text-base font-semibold text-violet-900">Song requests</p>
                      <p className="text-sm text-violet-800 mt-1.5">Add your song picks directly to our collaborative Spotify playlist.</p>
                      <a
                        href={musicPlaylistUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center mt-3 px-4 py-3 rounded-xl bg-violet-600 text-white text-base hover:bg-violet-700"
                      >
                        Open Spotify playlist
                      </a>
                    </div>
                  )}

                  {rsvpQuestions.length > 0 && (
                    <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-base font-semibold text-gray-900">A few quick questions from the couple</p>
                      {rsvpQuestions
                        .filter((q) => (q.appliesTo ?? 'all') === 'all' || ((q.appliesTo === 'ceremony' && formData.attendCeremony) || (q.appliesTo === 'reception' && formData.attendReception)))
                        .map((q) => (
                          <div key={q.id} className="space-y-2">
                            <label className="block text-base font-medium text-gray-900">{getRsvpQuestionLabel(q)}{q.required ? ' *' : ''}</label>
                            {q.type === 'long_text' ? (
                              <Textarea
                                value={customAnswers[q.id] ?? ''}
                                onChange={(e) => updateCustomAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                                rows={3}
                                placeholder="Your answer"
                              />
                            ) : (q.type === 'single_choice' || q.type === 'multi_choice') ? (
                              <div className="space-y-2">
                                {(q.options ?? []).map((opt) => {
                                  const current = customAnswers[q.id];
                                  const checked = q.type === 'multi_choice'
                                    ? (Array.isArray(current) ? current.includes(opt) : false)
                                    : (current ?? '') === opt;
                                  return (
                                  <label key={`${q.id}-${opt}`} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-white px-3 py-3 text-sm text-gray-800">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                          if (q.type === 'multi_choice') {
                                            updateCustomAnswers((prev) => {
                                              const curr = Array.isArray(prev[q.id]) ? [...(prev[q.id] as string[])] : [];
                                              if (e.target.checked) {
                                                if (!curr.includes(opt)) curr.push(opt);
                                              } else {
                                                const i = curr.indexOf(opt);
                                                if (i >= 0) curr.splice(i, 1);
                                              }
                                              return { ...prev, [q.id]: curr };
                                            });
                                          } else {
                                            if (e.target.checked) {
                                              updateCustomAnswers((prev) => ({ ...prev, [q.id]: opt }));
                                            } else {
                                              updateCustomAnswers((prev) => ({ ...prev, [q.id]: '' }));
                                            }
                                          }
                                        }}
                                        className="w-5 h-5"
                                      />
                                      <span className="text-base text-gray-900">{opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            ) : (
                              <Input
                                type="text"
                                value={customAnswers[q.id] ?? ''}
                                onChange={(e) => updateCustomAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                                placeholder="Your answer"
                              />
                            )}
                          </div>
                        ))}
                    </div>
                  )}

                  <div>
                    <label className="block text-base font-semibold mb-2">
                      Additional notes (optional)
                    </label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => updateFormData((current) => ({ ...current, notes: e.target.value }))}
                      placeholder="Dietary restrictions, accessibility needs, or special requests"
                      rows={3}
                    />
                  </div>
                </>
              )}

              {formStep === 3 && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-4">
                  {formData.attending && guest?.invited_to_ceremony && guest?.invited_to_reception && !formData.attendCeremony && !formData.attendReception && (
                    <div className="text-sm text-warning bg-warning/10 border border-warning/30 rounded-xl px-3 py-2.5">
                      Please review: attending is on, but no events are selected.
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm gap-4 rounded-xl bg-white px-4 py-3 border border-gray-200">
                    <span className="text-gray-700 font-semibold">Attendance</span>
                    <span className={`font-semibold px-2.5 py-1 rounded-full text-xs ${formData.attending ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {formData.attending ? 'Attending' : 'Not attending'}
                    </span>
                  </div>
                  {formData.attending && (guest.invited_to_ceremony || guest.invited_to_reception) && (
                    <div className="flex items-center justify-between text-sm gap-4 rounded-xl bg-white px-4 py-3 border border-gray-200">
                      <span className="text-gray-700 font-semibold">Events</span>
                      <span className="text-gray-900 text-right">{[guest.invited_to_ceremony ? (formData.attendCeremony ? 'Ceremony' : null) : null, guest.invited_to_reception ? (formData.attendReception ? 'Reception' : null) : null].filter(Boolean).join(' + ') || 'None selected'}</span>
                    </div>
                  )}
                  {formData.attending && formData.meal_choice && (
                    <div className="flex items-center justify-between text-sm gap-4 rounded-xl bg-white px-4 py-3 border border-gray-200">
                      <span className="text-gray-700 font-semibold">Meal</span>
                      <span className="text-gray-900 capitalize text-right">{formData.meal_choice}</span>
                    </div>
                  )}
                  {formData.attending && formData.plus_one_name && (
                    <div className="flex items-center justify-between text-sm gap-4 rounded-xl bg-white px-4 py-3 border border-gray-200">
                      <span className="text-gray-700 font-semibold">Plus one</span>
                      <span className="text-gray-900 text-right">{formData.plus_one_name}</span>
                    </div>
                  )}

                  {applyToHousehold && inheritedHouseholdMembers.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs uppercase updates-wide text-gray-500">Inherited to household</p>
                      {inheritedHouseholdMembers.map((h) => {
                        const name = h.first_name && h.last_name ? `${h.first_name} ${h.last_name}` : h.name;
                        const access = [h.invited_to_ceremony ? 'Ceremony' : null, h.invited_to_reception ? 'Reception' : null].filter(Boolean).join(' + ') || 'No event access';
                        return (
                          <div key={h.id} className="flex items-center justify-between text-sm gap-4">
                            <span className="text-gray-600 font-medium">{name}</span>
                            <span className="text-gray-900 text-right">{access}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {rsvpQuestions.length > 0 && Object.keys(customAnswers).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase updates-wide text-gray-500">Custom answers</p>
                      {rsvpQuestions.filter((q) => { const v = customAnswers[q.id]; return Array.isArray(v) ? v.length > 0 : String(v ?? '').trim().length > 0; }).map((q) => (
                        <div key={q.id} className="flex items-start justify-between text-sm gap-4 rounded-xl bg-white px-4 py-3 border border-gray-200">
                          <span className="text-gray-700 font-semibold flex-shrink-0">{getRsvpQuestionLabel(q)}</span>
                          <span className="text-gray-900 text-right">{Array.isArray(customAnswers[q.id]) ? (customAnswers[q.id] as string[]).join(', ') : String(customAnswers[q.id] ?? '')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {formData.notes && (
                    <div className="flex items-start justify-between text-sm gap-4 rounded-xl bg-white px-4 py-3 border border-gray-200">
                      <span className="text-gray-700 font-semibold flex-shrink-0">Notes</span>
                      <span className="text-gray-900 text-right">{formData.notes}</span>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-base flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-4 flex-col sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    invalidateActiveSubmit();
                    if (formStep > 1) {
                      setError('');
                      setFormStep((formStep - 1) as 1 | 2 | 3);
                    } else {
                      resetToSearch(false);
                    }
                  }}
                  className="flex-1 min-h-[48px] text-base"
                  disabled={loading}
                >
                  {formStep > 1 ? 'Back' : 'Cancel'}
                </Button>

                {formStep < 3 ? (
                  <Button
                    type="button"
                    onClick={goToNextFormStep}
                    className="flex-1 min-h-[48px] text-base"
                  >
                    {formStep === 1 ? 'Continue to details' : 'Continue to review'}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading || submitting || !canSubmit}
                    className="flex-1 min-h-[48px] text-base"
                  >
                    {loading ? 'Submitting...' : existingRsvp ? 'Update RSVP' : 'Submit RSVP'}
                  </Button>
                )}
              </div>
            </form>
          </Card>
        )}

        {step === 'success' && (
          <Card className="p-5 md:p-7">
            <div className="text-center mb-5">
              <div className="flex justify-center mb-3.5">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${formData.attending ? 'bg-green-100' : 'bg-neutral-100'}`}>
                  <CheckCircle className={`w-9 h-9 ${formData.attending ? 'text-green-500' : 'text-neutral-500'}`} />
                </div>
              </div>
              <h1 className="text-2xl md:text-3xl font-serif mb-1.5">
                {formData.attending ? "You're confirmed!" : "Response recorded"}
              </h1>
              <p className="text-gray-500 text-sm">
                {guestDisplayName && `For ${guestDisplayName}`}
              </p>
            </div>

            <details className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5">
              <summary className="cursor-pointer text-sm font-semibold text-gray-800 flex items-center justify-between">
                RSVP summary
                <span className="text-xs text-gray-500">View details</span>
              </summary>
              <div className="mt-2.5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 font-medium">Attendance</span>
                <span className={`font-semibold px-2.5 py-1 rounded-full text-xs ${
                  formData.attending
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {formData.attending ? "Attending" : "Not attending"}
                </span>
              </div>
              {formData.attending && formData.meal_choice && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 font-medium">Meal</span>
                  <span className="text-gray-900 capitalize">{formData.meal_choice}</span>
                </div>
              )}
              {formData.attending && (guest?.invited_to_ceremony || guest?.invited_to_reception) && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 font-medium">Events</span>
                  <span className="text-gray-900">{[guest?.invited_to_ceremony ? (formData.attendCeremony ? 'Ceremony' : null) : null, guest?.invited_to_reception ? (formData.attendReception ? 'Reception' : null) : null].filter(Boolean).join(' + ') || 'None selected'}</span>
                </div>
              )}
              {formData.attending && formData.plus_one_name && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 font-medium">Plus one</span>
                  <span className="text-gray-900">{formData.plus_one_name}</span>
                </div>
              )}
              {applyToHousehold && inheritedHouseholdMembers.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs uppercase updates-wide text-gray-500">Inherited to household</p>
                  {inheritedHouseholdMembers.map((h) => {
                    const name = h.first_name && h.last_name ? `${h.first_name} ${h.last_name}` : h.name;
                    const access = [h.invited_to_ceremony ? 'Ceremony' : null, h.invited_to_reception ? 'Reception' : null].filter(Boolean).join(' + ') || 'No event access';
                    return (
                      <div key={h.id} className="flex items-center justify-between text-sm gap-4">
                        <span className="text-gray-600 font-medium">{name}</span>
                        <span className="text-gray-900 text-right">{access}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {formData.notes && (
                <div className="flex items-start justify-between text-sm gap-4">
                  <span className="text-gray-600 font-medium flex-shrink-0">Notes</span>
                  <span className="text-gray-900 text-right">{formData.notes}</span>
                </div>
              )}
              </div>
            </details>

            {formData.attending && (
              <p className="text-center text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg py-3 px-4 mb-5">
                We can't wait to celebrate with you!
              </p>
            )}
            {!formData.attending && (
              <p className="text-center text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 mb-5">
                We'll miss you, but thank you for letting us know.
              </p>
            )}

            <div className="space-y-1.5">
              <Button
                onClick={() => {
                  if (guest?.invite_token) {
                    returnToLoadedRsvp();
                    return;
                  }
                  resetToSearch(true);
                }}
                className="w-full h-11"
              >
                Done
              </Button>
              <button
                onClick={() => {
                  resetToSearch(false);
                }}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                Submit another RSVP
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
