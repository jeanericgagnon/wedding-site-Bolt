import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { demoGuests, demoRSVPs } from '../lib/demoData';
import { DEMO_MODE, SUPABASE_CONFIGURED } from '../config/env';
import { getSafePublicWebUrl } from '../sections/publicLinks';
import { normalizeGuestLanguageCode, readStoredGuestLanguage, resolveGuestLanguagePreference, writeStoredGuestLanguage } from '../lib/guestLanguagePreference';
import {
  DEFAULT_MEAL_CONFIG,
  buildRsvpContinuityStorageKey,
  RSVP_CONTINUITY_EVENT,
  normalizeRsvpGuestError,
  normalizeRsvpSubmitError,
  type ExistingRSVP,
  type Guest,
  type HouseholdGuest,
  type RSVPMealConfig,
  type RSVPQuestion,
} from './rsvpTypes';
import {
  readDemoMealConfig,
  readDemoQuestions,
  readDemoStoredResponses,
} from './rsvpDemoStorage';
import { applyDemoRsvpSubmit } from './applyDemoRsvpSubmit';
import { applyManualRsvpLookupResult } from './applyManualRsvpLookupResult';
import { applyResolvedRsvpGuest } from './applyResolvedRsvpGuest';
import { applyRsvpSubmitSuccess } from './applyRsvpSubmitSuccess';
import { applyTokenRsvpLookupResult } from './applyTokenRsvpLookupResult';
import { buildRsvpSubmitPayload } from './buildRsvpSubmitPayload';
import { buildRsvpSubmitSuccessArgs } from './buildRsvpSubmitSuccessArgs';
import { buildRsvpDerivedViewState } from './buildRsvpDerivedViewState';
import { buildRsvpLiveContentActions } from './buildRsvpLiveContentActions';
import { buildRsvpPageViewModel } from './buildRsvpPageViewModel';
import { isFreshRsvpContinuityStorageValue, writeRsvpContinuityStoragePing } from './rsvpContinuityStorage';
import { buildRsvpLiveContentViewProps } from './buildRsvpLiveContentViewProps';
import { callValidateRsvpToken } from './rsvpFunctionService';
import { trackGuestHubEvent } from './guestHubPublicService';
import { prepareRsvpTokenLookupState } from './prepareRsvpTokenLookupState';
import { resetRsvpLookupFlow } from './resetRsvpLookupFlow';
import { resetRsvpPageState } from './resetRsvpPageState';
import { restoreLoadedRsvpState } from './restoreLoadedRsvpState';
import { RsvpPageRouteView } from './RsvpPageRouteView';
import { runRsvpGuestLookup } from './runRsvpGuestLookup';
import { runRsvpSubmit } from './runRsvpSubmit';
import { submitRsvpResponse } from './submitRsvpResponse';
import { validateRsvpFormAdvance } from './validateRsvpFormAdvance';
import { validateRsvpSubmitReadiness } from './validateRsvpSubmitReadiness';
import { runRsvpTokenLookup } from './runRsvpTokenLookup';

const USE_DEMO_RSVP = DEMO_MODE && !SUPABASE_CONFIGURED;

function notifyRsvpContinuityUpdate(siteSlug?: string | null) {
  if (typeof window === 'undefined') return;

  const storageKey = buildRsvpContinuityStorageKey(siteSlug);
  const updatedAt = writeRsvpContinuityStoragePing(storageKey);

  window.dispatchEvent(new CustomEvent(RSVP_CONTINUITY_EVENT, {
    detail: {
      updatedAt,
      siteSlug: String(siteSlug ?? '').trim().toLowerCase() || null,
      storageKey,
    },
  }));
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
  const [continuitySiteSlug, setContinuitySiteSlug] = useState<string | null>(null);
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
  const trackedInviteAnalyticsKeyRef = useRef<string | null>(null);
  const [activePredictionIndex, setActivePredictionIndex] = useState(-1);
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [rsvpQuestions, setRsvpQuestions] = useState<RSVPQuestion[]>([]);
  const [customAnswers, setCustomAnswers] = useState<Record<string, string | string[]>>({});
  const [mealConfig, setMealConfig] = useState<RSVPMealConfig>(DEFAULT_MEAL_CONFIG);
  const [householdGuests, setHouseholdGuests] = useState<HouseholdGuest[]>([]);
  const [applyToHousehold, setApplyToHousehold] = useState(true);
  const [selectedHouseholdGuestIds, setSelectedHouseholdGuestIds] = useState<string[]>([]);
  const currentGuestLanguage = normalizeGuestLanguageCode(i18n.resolvedLanguage ?? i18n.language) ?? 'en';
  const continuityStorageKey = useMemo(
    () => buildRsvpContinuityStorageKey(continuitySiteSlug),
    [continuitySiteSlug],
  );

  useEffect(() => {
    const languagePreference = resolveGuestLanguagePreference({
      search: searchParams,
      storedLanguage: readStoredGuestLanguage(activeToken),
    });
    if (languagePreference.language !== i18n.language?.split('-')[0]?.toLowerCase()) {
      void i18n.changeLanguage(languagePreference.language);
    }
    if (languagePreference.source === 'guest-link') {
      writeStoredGuestLanguage(languagePreference.language, activeToken);
    }
  }, [activeToken, i18n, searchParams]);

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
    resetRsvpPageState({
      setActivePredictionIndex,
      setAmbiguousGuests,
      setApplyToHousehold,
      setCustomAnswers,
      setError,
      setExistingRsvp,
      setFormData,
      setFormStep,
      setGuest,
      setHouseholdGuests,
      setLoading,
      setMealConfig,
      setMusicPlaylistUrl,
      setRsvpDeadline,
      setRsvpQuestions,
      setRsvpSessionToken,
      setSearchValue,
      setSelectedHouseholdGuestIds,
      setStep,
      setSubmitting,
      setTokenAutoLoading,
      searchValue: preserveToken ? (activeToken ?? '') : '',
    });
    tokenLinkedSessionRef.current = false;
    setContinuitySiteSlug(null);
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

    restoreLoadedRsvpState({
      activeToken,
      applyToHousehold,
      buildNormalizedExistingRsvp,
      buildNormalizedRsvpFormData,
      customAnswers,
      dedupeGuestIds,
      formData,
      guest,
      householdGuests,
      mealConfig,
      normalizeSelectedHouseholdGuestIds,
      selectedHouseholdGuestIds,
      setApplyToHousehold,
      setCustomAnswers,
      setError,
      setExistingRsvp,
      setFormData,
      setFormStep,
      setSelectedHouseholdGuestIds,
      setStep,
      tokenLinkedSessionRef,
    });
  }, [activeToken, applyToHousehold, customAnswers, formData, guest, householdGuests, invalidateActiveSubmit, mealConfig, resetToSearch, selectedHouseholdGuestIds]);

  useEffect(() => {
    return () => {
      activeLookupRequestRef.current += 1;
      activeSubmitRequestRef.current += 1;
      loadInFlightRef.current = false;
    };
  }, []);

  const loadInvitationForToken = useCallback((token: string, { preserveVisibleState = false }: { preserveVisibleState?: boolean } = {}) => {
    const lookupState = prepareRsvpTokenLookupState({
      activeLookupRequestRef,
      activeSubmitRequestRef,
      ignoreNextLocalContinuityEventRef,
      loadInFlightRef,
      pendingContinuityRefreshRef,
      preserveVisibleState,
      setActivePredictionIndex,
      setAmbiguousGuests,
      setApplyToHousehold,
      setCustomAnswers,
      setError,
      setExistingRsvp,
      setFormData,
      setFormStep,
      setGuest,
      setHouseholdGuests,
      setLoading,
      setMealConfig,
      setMusicPlaylistUrl,
      setRsvpDeadline,
      setRsvpQuestions,
      setRsvpSessionToken,
      setSearchValue,
      setSelectedHouseholdGuestIds,
      setStep,
      setSubmitting,
      setTokenAutoLoading,
      submitInFlightRef,
      token,
      tokenLinkedSessionRef,
    });
    if (lookupState.kind === 'empty') {
      return;
    }
    const { requestId, shouldPreserveVisibleState } = lookupState;
    runRsvpTokenLookup({
      activeLookupRequestRef,
      applyTokenRsvpLookupResult,
      callValidateRsvpToken,
      demoLookup,
      language: currentGuestLanguage,
      loadInFlightRef,
      normalizeRsvpGuestError,
      onInviteRouteResolved: (siteSlug) => {
        setContinuitySiteSlug(siteSlug);
        const analyticsKey = `${siteSlug}:${token}`;
        if (trackedInviteAnalyticsKeyRef.current === analyticsKey) return;
        trackedInviteAnalyticsKeyRef.current = analyticsKey;
        trackGuestHubEvent(siteSlug, 'view', '/rsvp/invite', { inviteToken: token }).catch(() => {});
      },
      requestId,
      selectGuest,
      setAmbiguousGuests,
      setApplyToHousehold,
      setError,
      setHouseholdGuests,
      setLoadCycle,
      setMealConfig,
      setMusicPlaylistUrl,
      setRsvpDeadline,
      setRsvpQuestions,
      setSelectedHouseholdGuestIds,
      setStep,
      setTokenAutoLoading,
      shouldPreserveVisibleState,
      token,
      tokenLinkedSessionRef,
      useDemoRsvp: USE_DEMO_RSVP,
    })
      .catch(() => undefined);
  }, [currentGuestLanguage]);

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
    trackedInviteAnalyticsKeyRef.current = null;
    loadInvitationForToken(activeToken ?? '');
  }, [activeToken, loadInvitationForToken]);

  useEffect(() => {
    if (!activeToken) return undefined;

    const handleRsvpContinuityUpdate = (event: Event) => {
      if (ignoreNextLocalContinuityEventRef.current) {
        ignoreNextLocalContinuityEventRef.current = false;
        return;
      }
      const continuityEvent = event as CustomEvent<{ storageKey?: string | null }>;
      if (continuityEvent.detail?.storageKey && continuityEvent.detail.storageKey !== continuityStorageKey) return;
      refreshTokenLinkedRsvpForContinuity();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== continuityStorageKey || !isFreshRsvpContinuityStorageValue(event.newValue)) return;
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
  }, [activeToken, continuityStorageKey, refreshTokenLinkedRsvpForContinuity]);

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
    pendingContinuityRefreshRef.current = false;
    ignoreNextLocalContinuityEventRef.current = false;
    tokenLinkedSessionRef.current = false;
    setTokenAutoLoading(false);
    resetRsvpLookupFlow({
      invalidateActiveSubmit,
      setActivePredictionIndex,
      setAmbiguousGuests,
      setApplyToHousehold,
      setCustomAnswers,
      setError,
      setExistingRsvp,
      setFormData,
      setFormStep,
      setGuest,
      setHouseholdGuests,
      setLoading,
      setMealConfig,
      setMusicPlaylistUrl,
      setRsvpDeadline,
      setRsvpQuestions,
      setSelectedHouseholdGuestIds,
      setStep,
      setSubmitting,
    });
    await runRsvpGuestLookup({
      activeLookupRequestRef,
      applyManualRsvpLookupResult,
      callValidateRsvpToken,
      demoLookup,
      language: currentGuestLanguage,
      lookupSource: 'search',
      normalizeRsvpGuestError,
      onLookupSiteResolved: setContinuitySiteSlug,
      requestId,
      searchValue,
      selectGuest,
      setAmbiguousGuests,
      setApplyToHousehold,
      setError,
      setHouseholdGuests,
      setLoading,
      setMealConfig,
      setMusicPlaylistUrl,
      setRsvpDeadline,
      setRsvpQuestions,
      setSelectedHouseholdGuestIds,
      setStep,
      useDemoRsvp: USE_DEMO_RSVP,
    });
  };

  function selectGuest(
    foundGuest: Guest,
    foundRsvp: ExistingRSVP | null = null,
    deadline: string | null = null,
    questions: RSVPQuestion[] = [],
    meal: RSVPMealConfig = { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] },
    household: HouseholdGuest[] = [],
    playlistUrl: string | null = null,
    source: 'manual' | 'token' = 'manual',
    sessionToken: string | null = null,
  ) {
    applyResolvedRsvpGuest({
      buildNormalizedRsvpFormData,
      deadline,
      deriveSelectedHouseholdGuestIds,
      foundGuest,
      foundRsvp,
      getLegacyTestRsvpSessionToken,
      household,
      meal,
      musicPlaylistUrl: playlistUrl,
      normalizeCustomAnswers,
      normalizeExistingRsvp,
      questions,
      sessionToken,
      setActivePredictionIndex,
      setApplyToHousehold,
      setCustomAnswers,
      setExistingRsvp,
      setFormData,
      setFormStep,
      setGuest,
      setHouseholdGuests,
      setMealConfig,
      setMusicPlaylistUrl,
      setRsvpDeadline,
      setRsvpQuestions,
      setRsvpSessionToken,
      setSelectedHouseholdGuestIds,
      setStep,
      shouldApplyToHousehold,
      source,
      tokenLinkedSessionRef,
    });
  }

  const handlePickGuest = async (picked: Guest) => {
    const requestId = activeLookupRequestRef.current + 1;
    activeLookupRequestRef.current = requestId;
    resetRsvpLookupFlow({
      invalidateActiveSubmit,
      searchValue: guestLabel(picked),
      setActivePredictionIndex,
      setAmbiguousGuests,
      setApplyToHousehold,
      setCustomAnswers,
      setError,
      setExistingRsvp,
      setFormData,
      setFormStep,
      setGuest,
      setHouseholdGuests,
      setLoading,
      setMealConfig,
      setMusicPlaylistUrl,
      setRsvpDeadline,
      setRsvpQuestions,
      setRsvpSessionToken,
      setSearchValue,
      setSelectedHouseholdGuestIds,
      setStep,
      setSubmitting,
    });
    await runRsvpGuestLookup({
      activeLookupRequestRef,
      applyManualRsvpLookupResult,
      callValidateRsvpToken,
      demoLookup,
      fallbackGuest: picked,
      guestId: picked.id,
      language: currentGuestLanguage,
      lookupSource: 'pick',
      normalizeRsvpGuestError,
      onLookupSiteResolved: setContinuitySiteSlug,
      requestId,
      rsvpSessionToken,
      selectGuest,
      setAmbiguousGuests,
      setApplyToHousehold,
      setError,
      setHouseholdGuests,
      setLoading,
      setMealConfig,
      setMusicPlaylistUrl,
      setRsvpDeadline,
      setRsvpQuestions,
      setSelectedHouseholdGuestIds,
      setStep,
      useDemoRsvp: USE_DEMO_RSVP,
    });
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
    await runRsvpSubmit({
      activeSubmitRequestRef,
      applyDemoRsvpSubmit,
      applyRsvpSubmitSuccess,
      applyToHousehold,
      buildNormalizedExistingRsvp,
      buildRsvpSubmitPayload,
      buildRsvpSubmitSuccessArgs,
      customAnswers,
      dedupeGuestIds,
      existingRsvp,
      formData,
      guest,
      householdGuests,
      ignoreNextLocalContinuityEventRef,
      mealConfig,
      musicPlaylistUrl,
      normalizeCustomAnswers,
      normalizeRsvpSubmitError,
      normalizeSelectedHouseholdGuestIds,
      notifyRsvpContinuityUpdate: () => notifyRsvpContinuityUpdate(continuitySiteSlug),
      requestId,
      rsvpDeadline,
      rsvpQuestions,
      rsvpSessionToken,
      selectGuest,
      selectedHouseholdGuestIds,
      setApplyToHousehold,
      setError,
      setLoading,
      setSelectedHouseholdGuestIds,
      setStep,
      setSubmitting,
      submitInFlightRef,
      submitRsvpResponse,
      tokenLinkedSession: tokenLinkedSessionRef.current,
      useDemoRsvp: USE_DEMO_RSVP,
      validateRsvpSubmitReadiness,
    });
  };

  const {
    availableMealValues,
    canSubmit,
    deadlinePassed,
    guestDisplayName,
    predictionListId,
    searchHintId,
    searchInputId,
  } = useMemo(() => buildRsvpPageViewModel({
    existingRsvp,
    guest,
    mealConfig,
    rsvpDeadline,
    rsvpSessionToken,
  }), [existingRsvp, guest, mealConfig, rsvpDeadline, rsvpSessionToken]);

  useEffect(() => {
    setActivePredictionIndex(-1);
  }, [searchValue]);

  const {
    activePredictionId,
    allowedChildrenCount,
    childCountOptions,
    guestPredictions,
    inheritedHouseholdMembers,
    invitedEvents,
  } = useMemo(() => buildRsvpDerivedViewState({
    activePredictionIndex,
    guest,
    householdGuests,
    predictionListId,
    searchValue,
    selectedHouseholdGuestIds,
    useDemoRsvp: USE_DEMO_RSVP,
  }), [activePredictionIndex, guest, householdGuests, predictionListId, searchValue, selectedHouseholdGuestIds]);

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

  const updateSearchValue = useCallback((value: string) => {
    invalidateActiveSubmit();
    setError('');
    setSearchValue(value);
  }, [invalidateActiveSubmit]);


  const goToNextFormStep = () => {
    const result = validateRsvpFormAdvance({
      customAnswers,
      formData,
      formStep,
      getRequiredQuestionValidationLabel,
      guest,
      mealConfig,
      rsvpQuestions,
    });

    if ('error' in result) {
      setError(result.error);
      return;
    }

    setError('');
    setFormStep(result.nextStep);
  };
  useEffect(() => {
    if (!mealConfig.enabled) {
      if (formData.meal_choice) setFormData((prev) => ({ ...prev, meal_choice: '' }));
      return;
    }
    if (formData.meal_choice && !availableMealValues.has(formData.meal_choice.toLowerCase())) {
      setFormData((prev) => ({ ...prev, meal_choice: '' }));
    }
  }, [mealConfig.enabled, availableMealValues, formData.meal_choice]);

  const liveContentActions = buildRsvpLiveContentActions({
    activeLookupRequestRef,
    formStep,
    guestPresent: !!guest,
    invalidateActiveSubmit,
    loading,
    resetToSearch,
    returnToLoadedRsvp,
    setError,
    setFormStep,
    setLoading,
    setSubmitting,
  });

  const liveContentProps = buildRsvpLiveContentViewProps({
    activePredictionId: activePredictionId,
    activePredictionIndex: activePredictionIndex,
    allowedChildrenCount: allowedChildrenCount,
    ambiguousGuests: ambiguousGuests,
    applyToHousehold: applyToHousehold,
    canSubmit: canSubmit,
    childCountOptions: childCountOptions,
    customAnswers: customAnswers,
    deadlinePassed: deadlinePassed,
    error: error,
    existingRsvp: existingRsvp,
    formData: formData,
    formStep: formStep,
    getQuestionLabel: getRsvpQuestionLabel,
    goToNextFormStep: goToNextFormStep,
    guest: guest,
    guestDisplayName: guestDisplayName,
    guestLabel: guestLabel,
    guestPredictions: guestPredictions,
    handleSubmit: handleSubmit,
    householdGuests: householdGuests,
    inheritedHouseholdMembers: inheritedHouseholdMembers,
    invitedEvents: invitedEvents,
    loading: loading,
    mealConfig: mealConfig,
    onActivePredictionIndexChange: setActivePredictionIndex,
    onBack: liveContentActions.onBack,
    onCancelLoading: liveContentActions.onCancelLoading,
    onDone: liveContentActions.onDone,
    onHouseholdSelectionChange: updateSelectedHouseholdGuestIds,
    onHouseholdToggle: updateApplyToHousehold,
    onPickGuest: handlePickGuest,
    onSearchAgain: liveContentActions.onSearchAgain,
    onSearchSubmit: handleSearch,
    onSearchValueChange: updateSearchValue,
    onStepAnswerChange: updateCustomAnswers,
    onStepDataChange: updateFormData,
    onSubmitAnother: liveContentActions.onSubmitAnother,
    predictionListId: predictionListId,
    rsvpDeadline: rsvpDeadline,
    rsvpQuestions: rsvpQuestions,
    rsvpSessionToken: rsvpSessionToken,
    safeMusicPlaylistUrl: safeMusicPlaylistUrl,
    searchHintId: searchHintId,
    searchInputId: searchInputId,
    searchValue: searchValue,
    selectedHouseholdGuestIds: selectedHouseholdGuestIds,
    step: step,
    submitting: submitting,
    t: t,
  });

  return (
    <RsvpPageRouteView
      liveContentProps={liveContentProps}
      onEnterCodeInstead={() => resetToSearch(false)}
      tokenAutoLoading={tokenAutoLoading}
    />
  );
}
