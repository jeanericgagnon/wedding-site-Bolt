import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Card } from '../components/ui/Card';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { OwnerPreviewBanner } from '../components/site/OwnerPreviewBanner';
import { CheckCircle, Search, AlertCircle, User } from 'lucide-react';
import { demoGuests, demoRSVPs } from '../lib/demoData';
import { DEMO_MODE, SUPABASE_CONFIGURED } from '../config/env';
import { formatRsvpDeadline, isRsvpDeadlinePassed } from './rsvpDeadline';
import { getSafePublicWebUrl } from '../sections/publicLinks';
import { readStoredGuestLanguage, resolveGuestLanguagePreference, writeStoredGuestLanguage } from '../lib/guestLanguagePreference';
import {
  DEFAULT_MEAL_CONFIG,
  RSVP_CONTINUITY_EVENT,
  RSVP_CONTINUITY_STORAGE_KEY,
  RSVP_LOOKUP_ERROR_COPY,
  RSVP_SUBMIT_ERROR_COPY,
  normalizeRsvpGuestError,
  normalizeRsvpSubmitError,
  type ExistingRSVP,
  type Guest,
  type HouseholdGuest,
  type LookupResponse,
  type RSVPMealConfig,
  type RSVPQuestion,
} from './rsvpTypes';
import {
  readDemoMealConfig,
  readDemoQuestions,
  readDemoStoredResponses,
  writeDemoStoredResponses,
} from './rsvpDemoStorage';
import { isFreshRsvpContinuityStorageValue, writeRsvpContinuityStoragePing } from './rsvpContinuityStorage';
import { callValidateRsvpToken } from './rsvpFunctionService';
import { RsvpRouteView } from './RsvpRouteView';
import { RsvpGuestPickerView } from './RsvpGuestPickerView';
import { RsvpSearchView } from './RsvpSearchView';
import { RsvpSuccessView } from './RsvpSuccessView';

export { normalizeRsvpGuestError, normalizeRsvpSubmitError } from './rsvpTypes';

const USE_DEMO_RSVP = DEMO_MODE && !SUPABASE_CONFIGURED;

function notifyRsvpContinuityUpdate() {
  if (typeof window === 'undefined') return;

  const updatedAt = writeRsvpContinuityStoragePing(RSVP_CONTINUITY_STORAGE_KEY);

  window.dispatchEvent(new CustomEvent(RSVP_CONTINUITY_EVENT, { detail: { updatedAt } }));
}

function getLegacyTestRsvpSessionToken(value: unknown): string | null {
  if (import.meta.env.MODE !== 'test' || !value || typeof value !== 'object') return null;

  const legacyInviteToken = (value as { invite_token?: unknown }).invite_token;
  return typeof legacyInviteToken === 'string' && legacyInviteToken.trim().length > 0
    ? `test-legacy-session:${legacyInviteToken.trim()}`
    : null;
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
  children_count: number;
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
    children_count: formData.children_count,
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
): { attending: boolean; attendCeremony: boolean; attendReception: boolean; meal_choice: string; plus_one_name: string; children_count: number; notes: string } {
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
    children_count: Number(existingRsvp.children_count ?? 0),
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

  const legacyMatch = notes.match(/^Attending events(?:\s*[:\-])?\s+([^\r\n]+)(?:\r?\n([\s\S]*))?$/i);
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



function mapDemoGuest(g: (typeof demoGuests)[number]): Guest {
  return {
    id: g.id,
    first_name: g.first_name ?? null,
    last_name: g.last_name ?? null,
    name: g.name,
    plus_one_allowed: false,
    invited_to_ceremony: !!g.invited_to_ceremony,
    invited_to_reception: !!g.invited_to_reception,
  };
}

function demoLookup(searchValue: string): { guest: Guest | null; existingRsvp: ExistingRSVP | null; guests: Guest[] | null; rsvpDeadline: string | null; rsvpQuestions: RSVPQuestion[]; rsvpMealConfig: RSVPMealConfig; musicPlaylistUrl: string | null; householdGuests: HouseholdGuest[] } {
  const trimmed = searchValue.trim().toLowerCase();
  const questions = readDemoQuestions();
  const meal = readDemoMealConfig();
  const householdFor = (g: (typeof demoGuests)[number]): HouseholdGuest[] => demoGuests
    .filter((x) => x.household_id === g.household_id && x.id !== g.id)
    .map((x) => ({
      id: x.id,
      first_name: x.first_name ?? null,
      last_name: x.last_name ?? null,
      name: x.name,
      invited_to_ceremony: !!x.invited_to_ceremony,
      invited_to_reception: !!x.invited_to_reception,
    }));
  const stored = readDemoStoredResponses();

  const tokenMatch = demoGuests.find((g) => (g.invite_token || '').toLowerCase() === trimmed);
  const idMatch = demoGuests.find((g) => g.id.toLowerCase() === trimmed);
  const directMatch = tokenMatch ?? idMatch;
  if (directMatch) {
    const mapped = mapDemoGuest(directMatch);
    const existing = stored[directMatch.id] ?? (demoRSVPs.find((r) => r.guest_id === directMatch.id)
      ? {
          id: `demo-rsvp-${directMatch.id}`,
          attending: !!demoRSVPs.find((r) => r.guest_id === directMatch.id)?.attending,
          meal_choice: demoRSVPs.find((r) => r.guest_id === directMatch.id)?.meal_choice ?? null,
          plus_one_name: demoRSVPs.find((r) => r.guest_id === directMatch.id)?.plus_one_name ?? null,
          notes: demoRSVPs.find((r) => r.guest_id === directMatch.id)?.notes ?? null,
          custom_answers: null,
        }
      : null);
    return { guest: mapped, existingRsvp: existing ?? null, guests: null, rsvpDeadline: null, rsvpQuestions: questions, rsvpMealConfig: meal, musicPlaylistUrl: null, householdGuests: householdFor(directMatch) };
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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token: routeToken } = useParams<{ token?: string }>();
  const activeToken = searchParams.get('token') || routeToken || null;
  const [step, setStep] = useState<'search' | 'pick' | 'form' | 'success'>('search');
  const [searchValue, setSearchValue] = useState('');
  const [guest, setGuest] = useState<Guest | null>(null);
  const [rsvpSessionToken, setRsvpSessionToken] = useState<string | null>(null);
  const [ambiguousGuests, setAmbiguousGuests] = useState<Guest[]>([]);
  const [existingRsvp, setExistingRsvp] = useState<ExistingRSVP | null>(null);
  const [rsvpDeadline, setRsvpDeadline] = useState<string | null>(null);
  const [musicPlaylistUrl, setMusicPlaylistUrl] = useState<string | null>(null);
  const safeMusicPlaylistUrl = getSafePublicWebUrl(musicPlaylistUrl);
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

  useEffect(() => {
    const languagePreference = resolveGuestLanguagePreference({
      search: searchParams,
      storedLanguage: readStoredGuestLanguage(),
    });
    if (languagePreference.language !== i18n.language?.split('-')[0]?.toLowerCase()) {
      void i18n.changeLanguage(languagePreference.language);
    }
    if (languagePreference.source === 'guest-link') {
      writeStoredGuestLanguage(languagePreference.language);
    }
  }, [i18n, searchParams]);

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
    setRsvpSessionToken(null);
    setExistingRsvp(null);
    setAmbiguousGuests([]);
    setRsvpDeadline(null);
    setMusicPlaylistUrl(null);
    setFormData({ attending: true, attendCeremony: false, attendReception: false, meal_choice: '', plus_one_name: '', children_count: 0, notes: '' });
    setCustomAnswers({});
    setRsvpQuestions([]);
    setMealConfig(DEFAULT_MEAL_CONFIG);
    setHouseholdGuests([]);
    setApplyToHousehold(true);
    setSelectedHouseholdGuestIds([]);
    setFormStep(1);
    setActivePredictionIndex(-1);
    tokenLinkedSessionRef.current = false;
    setSearchValue(preserveToken ? (activeToken ?? '') : '');
    if (!preserveToken && activeToken) {
      navigate('/rsvp', { replace: true });
    }
  }, [activeToken, invalidateActiveSubmit, navigate]);

  const [formData, setFormData] = useState({
    attending: true,
    attendCeremony: true,
    attendReception: true,
    meal_choice: '',
    plus_one_name: '',
    children_count: 0,
    notes: '',
  });

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
        children_count: 0,
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

    tokenLinkedSessionRef.current = !!activeToken;
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
      setRsvpSessionToken(null);
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
        children_count: 0,
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
      setRsvpSessionToken(null);
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
      setFormData({ attending: true, attendCeremony: true, attendReception: true, meal_choice: '', plus_one_name: '', children_count: 0, notes: '' });
      setFormStep(1);
      setActivePredictionIndex(-1);
    }
    (
      USE_DEMO_RSVP
        ? Promise.resolve<{ data?: unknown; error?: string; status?: number }>({
            data: demoLookup(token) as unknown,
            error: undefined,
          })
        : callValidateRsvpToken({ action: 'lookup', searchValue: token })
    )
      .then(({ data, error: err }) => {
        if (activeLookupRequestRef.current !== requestId) return;
        if (err || !data) {
          if (shouldPreserveVisibleState) {
            tokenLinkedSessionRef.current = true;
            return;
          }
          tokenLinkedSessionRef.current = false;
          setError(normalizeRsvpGuestError(err));
          setTokenAutoLoading(false);
          return;
        }
        const result = data as LookupResponse;
        if (result.guest) {
          selectGuest(result.guest, result.existingRsvp, result.rsvpDeadline, result.rsvpQuestions ?? [], result.rsvpMealConfig ?? { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] }, result.householdGuests ?? [], result.musicPlaylistUrl ?? null, 'token', result.rsvpSession ?? null);
        } else if (result.guests && result.guests.length === 1) {
          selectGuest(result.guests[0], result.existingRsvp, result.rsvpDeadline, result.rsvpQuestions ?? [], result.rsvpMealConfig ?? { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] }, result.householdGuests ?? [], result.musicPlaylistUrl ?? null, 'token', result.rsvpSession ?? null);
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
          setError(RSVP_LOOKUP_ERROR_COPY);
        }
      })
      .catch(() => {
        if (activeLookupRequestRef.current !== requestId) return;
        if (shouldPreserveVisibleState) {
          tokenLinkedSessionRef.current = true;
          return;
        }
        tokenLinkedSessionRef.current = false;
        setError(RSVP_LOOKUP_ERROR_COPY);
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
      if (event.key !== RSVP_CONTINUITY_STORAGE_KEY || !isFreshRsvpContinuityStorageValue(event.newValue)) return;
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
    setFormData({ attending: true, attendCeremony: false, attendReception: false, meal_choice: '', plus_one_name: '', children_count: 0, notes: '' });
    setCustomAnswers({});
    setRsvpQuestions([]);
    setMealConfig(DEFAULT_MEAL_CONFIG);
    setHouseholdGuests([]);
    setApplyToHousehold(true);
    setSelectedHouseholdGuestIds([]);
    setFormStep(1);

    try {
      const lookupResp: { data?: unknown; error?: string } = USE_DEMO_RSVP
        ? { data: demoLookup(searchValue.trim()) as unknown }
        : await callValidateRsvpToken({ action: 'lookup', searchValue: searchValue.trim() });
      const data = lookupResp.data;
      const err = lookupResp.error;
      if (err) {
        if (activeLookupRequestRef.current !== requestId) return;
        setError(normalizeRsvpGuestError(err));
        return;
      }
      if (!data) {
        if (activeLookupRequestRef.current !== requestId) return;
        setError(RSVP_LOOKUP_ERROR_COPY);
        return;
      }

      const result = data as LookupResponse;

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
        selectGuest(result.guests[0], result.existingRsvp, result.rsvpDeadline, result.rsvpQuestions ?? [], result.rsvpMealConfig ?? { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] }, result.householdGuests ?? [], result.musicPlaylistUrl ?? null, 'manual', result.rsvpSession ?? null);
        return;
      }

      if (!result.guest) {
        if (activeLookupRequestRef.current !== requestId) return;
        setError(RSVP_LOOKUP_ERROR_COPY);
        return;
      }

      const foundGuest = result.guest;
      if (activeLookupRequestRef.current !== requestId) return;
      selectGuest(foundGuest, result.existingRsvp, result.rsvpDeadline, result.rsvpQuestions ?? [], result.rsvpMealConfig ?? { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] }, result.householdGuests ?? [], result.musicPlaylistUrl ?? null, 'manual', result.rsvpSession ?? null);
    } catch {
      if (activeLookupRequestRef.current !== requestId) return;
      setError('Something interrupted the search. Please try again.');
    } finally {
      if (activeLookupRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  function selectGuest(
    foundGuest: Guest,
    foundRsvp: ExistingRSVP | null,
    deadline: string | null = null,
    questions: RSVPQuestion[] = [],
    meal: RSVPMealConfig = { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] },
    household: HouseholdGuest[] = [],
    playlistUrl: string | null = null,
    source: 'manual' | 'token' = 'manual',
    sessionToken: string | null = null,
  ) {
    const normalizedRsvp = foundRsvp ? normalizeExistingRsvp(foundRsvp) : null;
    tokenLinkedSessionRef.current = source === 'token';
    setGuest(foundGuest);
    setRsvpSessionToken(sessionToken ?? getLegacyTestRsvpSessionToken(foundGuest));
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
        children_count: 0,
        notes: '',
      });
      setCustomAnswers({});
    }
    setFormStep(1);
    setStep('form');
  }

  const handlePickGuest = async (picked: Guest) => {
    const requestId = activeLookupRequestRef.current + 1;
    activeLookupRequestRef.current = requestId;
    invalidateActiveSubmit();
    setLoading(true);
    setSubmitting(false);
    setActivePredictionIndex(-1);
    setError('');
    setStep('search');
    setSearchValue(guestLabel(picked));
    setAmbiguousGuests([]);
      setGuest(null);
      setRsvpSessionToken(null);
      setExistingRsvp(null);
    setRsvpDeadline(null);
    setMusicPlaylistUrl(null);
    setFormData({ attending: true, attendCeremony: false, attendReception: false, meal_choice: '', plus_one_name: '', children_count: 0, notes: '' });
    setCustomAnswers({});
    setRsvpQuestions([]);
    setMealConfig(DEFAULT_MEAL_CONFIG);
    setFormStep(1);
    setHouseholdGuests([]);
    setApplyToHousehold(true);
    setSelectedHouseholdGuestIds([]);
    try {
      const lookupResp: { data?: unknown; error?: string } = USE_DEMO_RSVP
        ? { data: demoLookup(picked.id) as unknown }
        : await callValidateRsvpToken({ action: 'lookup_guest', guestId: picked.id, rsvpSession: rsvpSessionToken });
      const data = lookupResp.data;
      const err = lookupResp.error;
      if (err || !data) {
        if (activeLookupRequestRef.current !== requestId) return;
        selectGuest(picked, null, null, [], DEFAULT_MEAL_CONFIG, [], null);
        return;
      }
      const result = data as LookupResponse;
      if (activeLookupRequestRef.current !== requestId) return;
      const resolvedGuest = result.guest
        ?? (result.guests && result.guests.length === 1 ? result.guests[0] : null)
        ?? picked;
      selectGuest(resolvedGuest, result.existingRsvp, result.rsvpDeadline, result.rsvpQuestions ?? [], result.rsvpMealConfig ?? { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] }, result.householdGuests ?? [], result.musicPlaylistUrl ?? null, 'manual', result.rsvpSession ?? null);
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

      if (!rsvpSessionToken) {
        if (activeSubmitRequestRef.current !== requestId) return;
        setError('Please use the RSVP button from your invitation email so we can open the right response.');
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
      const childrenCount = formData.attending ? Math.max(0, Number(formData.children_count ?? 0)) : 0;
      const normalizedCustomAnswers = normalizeCustomAnswers(customAnswers);

      if (applyToHousehold && householdGuests.length > 0 && selectedHouseholdGuestIds.length === 0) {
        if (activeSubmitRequestRef.current !== requestId) return;
        setError('Pick at least one household guest to share this RSVP with, or turn inheritance off.');
        return;
      }

      if (USE_DEMO_RSVP) {
        const stored = readDemoStoredResponses();
        const targetIds = applyToHousehold ? dedupeGuestIds([guest.id, ...selectedHouseholdGuestIds]) : [guest.id];
        const payload = buildNormalizedExistingRsvp(formData, customAnswers, `demo-rsvp-${guest.id}`, targetIds);
        const normalizedSelectedHouseholdGuestIds = normalizeSelectedHouseholdGuestIds(targetIds.filter((id) => id !== guest.id), householdGuests);
        const submitSource = tokenLinkedSessionRef.current ? 'token' : 'manual';
        targetIds.forEach((id) => { stored[id] = { ...payload, id: `demo-rsvp-${id}` }; });
        writeDemoStoredResponses(stored);
        if (activeSubmitRequestRef.current !== requestId) return;
        selectGuest(guest, payload, rsvpDeadline, rsvpQuestions, mealConfig, householdGuests, musicPlaylistUrl, submitSource, rsvpSessionToken);
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

      const { data, error: err } = await callValidateRsvpToken({
        action: 'submit',
        guestId: guest.id,
        rsvpSession: rsvpSessionToken,
        attending: formData.attending,
        attendCeremony: formData.attendCeremony,
        attendReception: formData.attendReception,
        mealChoice: mealChoice || null,
        plusOneName: plusOneName || null,
        plusOneCount: plusOneName ? 1 : 0,
        childrenCount,
        notes: notesPayload || null,
        customAnswers: normalizedCustomAnswers,
        applyToHousehold,
        targetGuestIds,
      });

      const submitSucceeded = !!(data && typeof data === 'object' && 'success' in data && (data as { success?: boolean }).success);

      if (err || !submitSucceeded) {
        if (activeSubmitRequestRef.current !== requestId) return;
        setError(normalizeRsvpSubmitError(err));
        return;
      }

      if (activeSubmitRequestRef.current !== requestId) return;
      const normalizedExistingRsvp = buildNormalizedExistingRsvp(formData, customAnswers, existingRsvp?.id ?? 'submitted-rsvp', targetGuestIds);
      const normalizedSelectedHouseholdGuestIds = normalizeSelectedHouseholdGuestIds(targetGuestIds.filter((id) => id !== guest.id), householdGuests);
      const submitSource = tokenLinkedSessionRef.current ? 'token' : 'manual';
      selectGuest(guest, normalizedExistingRsvp, rsvpDeadline, rsvpQuestions, mealConfig, householdGuests, musicPlaylistUrl, submitSource, rsvpSessionToken);
      setApplyToHousehold(applyToHousehold && normalizedSelectedHouseholdGuestIds.length > 0);
      setSelectedHouseholdGuestIds(applyToHousehold ? normalizedSelectedHouseholdGuestIds : []);
      ignoreNextLocalContinuityEventRef.current = true;
      notifyRsvpContinuityUpdate();
      setStep('success');
    } catch {
      if (activeSubmitRequestRef.current !== requestId) return;
      setError(RSVP_SUBMIT_ERROR_COPY);
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

  const canSubmit = !!rsvpSessionToken && !(deadlinePassed && !existingRsvp);
  const searchInputId = 'rsvp-guest-search';
  const searchHintId = 'rsvp-search-hint';
  const predictionListId = 'rsvp-guest-predictions';

  useEffect(() => {
    setActivePredictionIndex(-1);
  }, [searchValue]);

  const guestPredictions = useMemo(() => {
    if (!USE_DEMO_RSVP) return [] as string[];
    const q = searchValue.trim().toLowerCase();
    if (q.length < 2) return [] as string[];
    return demoGuests
      .map((g) => g.name)
      .filter((name, idx, arr) => arr.indexOf(name) === idx)
      .filter((name) => name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [searchValue]);
  const activePredictionId =
    activePredictionIndex >= 0 && guestPredictions[activePredictionIndex]
      ? `${predictionListId}-${activePredictionIndex}`
      : undefined;

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
  const allowedChildrenCount = guest?.children_allowed ? Math.max(0, Number(guest.max_children ?? 0)) : 0;
  const childCountOptions = Array.from({ length: allowedChildrenCount + 1 }, (_, count) => ({
    value: String(count),
    label: count === 0 ? 'No children' : `${count} child${count === 1 ? '' : 'ren'}`,
  }));

  const inheritedHouseholdMembers = useMemo(
    () => householdGuests.filter((h) => selectedHouseholdGuestIds.includes(h.id)),
    [householdGuests, selectedHouseholdGuestIds]
  );
  const tokenAutoLoadingView = (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 text-sm">Loading your invitation…</p>
        <button
          type="button"
          onClick={() => resetToSearch(false)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Enter invitation code instead
        </button>
      </div>
    </div>
  );

  const liveContent = (
    <div className="min-h-screen overflow-hidden bg-background">
      {step === 'search' ? (
        <RsvpSearchView
          activePredictionId={activePredictionId}
          activePredictionIndex={activePredictionIndex}
          error={error}
          guestPredictions={guestPredictions}
          loading={loading}
          onActivePredictionIndexChange={setActivePredictionIndex}
          onCancelLoading={() => {
            if (loading) {
              activeLookupRequestRef.current += 1;
              setLoading(false);
              setSubmitting(false);
            }
            setError('');
          }}
          onSearchSubmit={handleSearch}
          onSearchValueChange={setSearchValue}
          predictionListId={predictionListId}
          searchHintId={searchHintId}
          searchInputId={searchInputId}
          searchValue={searchValue}
          t={t}
        />
      ) : (
      <div className="container relative z-10 mx-auto max-w-2xl px-4 pb-14">
        {step === 'pick' && (
          <RsvpGuestPickerView
            ambiguousGuests={ambiguousGuests}
            guestLabel={guestLabel}
            loading={loading}
            onPickGuest={handlePickGuest}
            onSearchAgain={() => { resetToSearch(false); }}
          />
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
              <div className="mb-6 p-4 bg-surface-subtle/50 border border-border-subtle rounded-lg text-text-secondary text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">RSVP deadline has passed</p>
                  <p className="mt-0.5">The deadline was {formatRsvpDeadline(rsvpDeadline)}. Please contact the couple directly.</p>
                </div>
              </div>
            )}

            {existingRsvp && (
              <>
                <div className="mb-6 p-4 bg-primary/5 border border-primary/15 rounded-lg text-text-secondary text-sm space-y-1">
                  <p className="font-medium">We have your current RSVP on file.</p>
                  <p>You can review or update your details here. If plans change later, use this same link again.</p>
                </div>
                <div className="mb-6 p-4 bg-surface-subtle/40 border border-border-subtle rounded-lg text-text-secondary text-sm space-y-1">
                  <p className="font-medium text-text-primary">Check back here for updates</p>
                  <p>The couple may refine timing, travel notes, or day-of details later. This same RSVP link will still bring you back to the right place.</p>
                </div>
              </>
            )}

            {deadlinePassed && existingRsvp && (
              <div className="mb-6 p-4 bg-surface-subtle/50 border border-border-subtle rounded-lg text-text-secondary text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                The RSVP deadline has passed, but you can still update your existing response.
              </div>
            )}

            {!rsvpSessionToken && (
              <div className="mb-6 p-4 bg-surface-subtle/50 border border-border-subtle rounded-lg text-text-secondary text-base space-y-2">
                <div className="flex items-start gap-2 font-medium">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  Can't submit — missing invitation link
                </div>
                <p className="pl-7 text-sm text-text-secondary">To RSVP, open the invitation email you received and click the RSVP button. That link takes you to the right response for your invitation.</p>
              </div>
            )}

            <div className="mb-5 p-4 bg-surface-subtle/40 border border-border-subtle rounded-lg">
              <div className="flex items-center gap-2 text-xs">
                {[1, 2, 3].map((n) => (
                  <div key={n} className={`flex items-center gap-2 ${n < 3 ? 'flex-1' : ''}`}>
                    <div className={`w-6 h-6 rounded-md grid place-items-center font-semibold ${formStep >= n ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>{n}</div>
                    {n < 3 && <div className={`h-0.5 flex-1 ${formStep > n ? 'bg-primary/50' : 'bg-gray-200'}`} />}
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
                    <div className="p-4 bg-surface-subtle/50 border border-border-subtle rounded-lg text-sm">
                      <p className="font-semibold mb-1.5 text-base text-gray-900">Your event access details</p>
                      <ul className="list-disc list-inside space-y-1.5 text-base text-gray-800">
                        {invitedEvents.map((ev) => <li key={ev}>{ev}</li>)}
                      </ul>
                    </div>
                  )}
                  {householdGuests.length > 0 && (
                    <div className="text-sm p-4 bg-surface-subtle/50 border border-border-subtle rounded-lg space-y-3">
                      <label className="flex items-start gap-3">
                        <input type="checkbox" checked={applyToHousehold} onChange={(e) => updateApplyToHousehold(e.target.checked)} className="w-5 h-5 mt-0.5" />
                        <span className="font-semibold text-base text-gray-900">Inherit this RSVP to selected household guests</span>
                      </label>

                      {applyToHousehold && (
                        <details className="rounded-lg border border-border-subtle bg-white p-3">
                          <summary className="cursor-pointer text-sm font-semibold text-text-primary flex items-center justify-between gap-2">
                            <span>Choose household guests</span>
                            <span className="text-xs text-text-tertiary">{selectedHouseholdGuestIds.length}/{householdGuests.length} selected</span>
                          </summary>
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => updateSelectedHouseholdGuestIds(() => householdGuests.map((h) => h.id))}
                                className="text-xs px-3 py-2 rounded-lg border border-border-subtle text-text-secondary hover:bg-surface-subtle"
                              >
                                Select all
                              </button>
                              <button
                                type="button"
                                onClick={() => updateSelectedHouseholdGuestIds(() => [])}
                                className="text-xs px-3 py-2 rounded-lg border border-border-subtle text-text-secondary hover:bg-surface-subtle"
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
                                  <label key={h.id} className="flex items-center justify-between gap-3 bg-white border border-border-subtle rounded-lg px-3 py-2.5">
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
                        <div className="p-4 bg-surface-subtle/50 border border-border-subtle rounded-lg space-y-4">
                          <div className="space-y-1.5">
                            <p className="text-base font-semibold text-gray-900">Which events will you attend?</p>
                            <p className="text-sm text-gray-600">Choose the parts of the celebration you're joining.</p>
                          </div>
                          {guest.invited_to_ceremony && (
                            <label className="flex items-center justify-between gap-4 rounded-lg border border-border-subtle bg-white px-4 py-3 text-sm">
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
                            <label className="flex items-center justify-between gap-4 rounded-lg border border-border-subtle bg-white px-4 py-3 text-sm">
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

                      {allowedChildrenCount > 0 && (
                        <div>
                          <label className="block text-base font-semibold mb-2">
                            Children attending
                          </label>
                          <Select
                            value={String(formData.children_count)}
                            onChange={(e) => updateFormData((current) => ({ ...current, children_count: Number(e.target.value) }))}
                            className="h-12 text-base"
                            options={childCountOptions}
                          />
                          <p className="text-sm text-gray-600 mt-2">Your invitation allows up to {allowedChildrenCount} child{allowedChildrenCount === 1 ? '' : 'ren'}.</p>
                        </div>
                      )}
                    </>
                  )}


                  {safeMusicPlaylistUrl && (
                    <div className="p-4 bg-surface-subtle/50 border border-border-subtle rounded-lg">
                      <p className="text-base font-semibold text-text-primary">Song requests</p>
                      <p className="text-sm text-text-secondary mt-1.5">Add your song picks directly to our collaborative Spotify playlist.</p>
                      <a
                        href={safeMusicPlaylistUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center mt-3 px-4 py-3 rounded-lg bg-primary text-white text-base hover:bg-primary-hover"
                      >
                        Open Spotify playlist
                      </a>
                    </div>
                  )}

                  {rsvpQuestions.length > 0 && (
                    <div className="space-y-4 p-4 bg-surface-subtle/50 border border-border-subtle rounded-lg">
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
                                  <label key={`${q.id}-${opt}`} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-white px-3 py-3 text-sm text-gray-800">
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
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                  {formData.attending && guest?.invited_to_ceremony && guest?.invited_to_reception && !formData.attendCeremony && !formData.attendReception && (
                    <div className="text-sm text-warning bg-warning/10 border border-warning/30 rounded-lg px-3 py-2.5">
                      Please review: attending is on, but no events are selected.
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm gap-4 rounded-lg bg-white px-4 py-3 border border-gray-200">
                    <span className="text-gray-700 font-semibold">Attendance</span>
                    <span className={`font-semibold px-2.5 py-1 rounded-lg text-xs ${formData.attending ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-700'}`}>
                      {formData.attending ? 'Attending' : 'Not attending'}
                    </span>
                  </div>
                  {formData.attending && (guest.invited_to_ceremony || guest.invited_to_reception) && (
                    <div className="flex items-center justify-between text-sm gap-4 rounded-lg bg-white px-4 py-3 border border-gray-200">
                      <span className="text-gray-700 font-semibold">Events</span>
                      <span className="text-gray-900 text-right">{[guest.invited_to_ceremony ? (formData.attendCeremony ? 'Ceremony' : null) : null, guest.invited_to_reception ? (formData.attendReception ? 'Reception' : null) : null].filter(Boolean).join(' + ') || 'None selected'}</span>
                    </div>
                  )}
                  {formData.attending && formData.meal_choice && (
                    <div className="flex items-center justify-between text-sm gap-4 rounded-lg bg-white px-4 py-3 border border-gray-200">
                      <span className="text-gray-700 font-semibold">Meal</span>
                      <span className="text-gray-900 capitalize text-right">{formData.meal_choice}</span>
                    </div>
                  )}
                  {formData.attending && formData.plus_one_name && (
                    <div className="flex items-center justify-between text-sm gap-4 rounded-lg bg-white px-4 py-3 border border-gray-200">
                      <span className="text-gray-700 font-semibold">Plus one</span>
                      <span className="text-gray-900 text-right">{formData.plus_one_name}</span>
                    </div>
                  )}
                  {formData.attending && formData.children_count > 0 && (
                    <div className="flex items-center justify-between text-sm gap-4 rounded-lg bg-white px-4 py-3 border border-gray-200">
                      <span className="text-gray-700 font-semibold">Children</span>
                      <span className="text-gray-900 text-right">{formData.children_count}</span>
                    </div>
                  )}

                  {applyToHousehold && inheritedHouseholdMembers.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-gray-500">Inherited to household</p>
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
                      <p className="text-xs font-medium text-gray-500">Custom answers</p>
                      {rsvpQuestions.filter((q) => { const v = customAnswers[q.id]; return Array.isArray(v) ? v.length > 0 : String(v ?? '').trim().length > 0; }).map((q) => (
                        <div key={q.id} className="flex items-start justify-between text-sm gap-4 rounded-lg bg-white px-4 py-3 border border-gray-200">
                          <span className="text-gray-700 font-semibold flex-shrink-0">{getRsvpQuestionLabel(q)}</span>
                          <span className="text-gray-900 text-right">{Array.isArray(customAnswers[q.id]) ? (customAnswers[q.id] as string[]).join(', ') : String(customAnswers[q.id] ?? '')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {formData.notes && (
                    <div className="flex items-start justify-between text-sm gap-4 rounded-lg bg-white px-4 py-3 border border-gray-200">
                      <span className="text-gray-700 font-semibold flex-shrink-0">Notes</span>
                      <span className="text-gray-900 text-right">{formData.notes}</span>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="p-4 bg-surface-subtle/50 border border-border-subtle rounded-lg text-text-secondary text-base flex items-start gap-3">
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
          <RsvpSuccessView
            applyToHousehold={applyToHousehold}
            formData={formData}
            guestDisplayName={guestDisplayName}
            guestInvitedToCeremony={!!guest?.invited_to_ceremony}
            guestInvitedToReception={!!guest?.invited_to_reception}
            guestPresent={!!guest}
            inheritedHouseholdMembers={inheritedHouseholdMembers}
            onDone={() => {
              if (guest) {
                returnToLoadedRsvp();
                return;
              }
              resetToSearch(true);
            }}
            onSubmitAnother={() => {
              resetToSearch(false);
            }}
          />
        )}
      </div>
      )}
    </div>
  );

  return (
    <RsvpRouteView
      tokenAutoLoading={tokenAutoLoading}
      tokenAutoLoadingView={tokenAutoLoadingView}
      liveContent={liveContent}
    />
  );
}
