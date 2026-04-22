import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Card } from '../components/ui/Card';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { CheckCircle, Search, AlertCircle, User } from 'lucide-react';
import { demoGuests, demoRSVPs } from '../lib/demoData';
import { DEMO_MODE } from '../config/env';

const RSVP_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-rsvp-token`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const DEMO_RSVP_QUESTIONS_KEY = 'dayof_demo_rsvp_custom_questions_v1';
const DEMO_RSVP_RESPONSES_KEY = 'dayof_demo_rsvp_responses_v1';
const DEMO_RSVP_MEAL_KEY = 'dayof_demo_rsvp_meal_config_v1';
const DEFAULT_MEAL_CONFIG: RSVPMealConfig = { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] };

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


function parseEventSelectionsFromNotes(notes: string | null, guest: Guest): { cleanNotes: string; attendCeremony: boolean; attendReception: boolean } {
  const fallback = {
    cleanNotes: notes || '',
    attendCeremony: !!guest.invited_to_ceremony,
    attendReception: !!guest.invited_to_reception,
  };

  if (!notes) return fallback;

  const match = notes.match(/\[Events\s+([^\]]+)\]/i);
  if (!match) return fallback;

  const eventPart = match[1] || '';
  const map = Object.fromEntries(
    eventPart
      .split(',')
      .map((piece) => piece.trim())
      .map((piece) => {
        const [k, v] = piece.split(':').map((x) => (x || '').trim().toLowerCase());
        return [k, v === 'yes'];
      })
  ) as Record<string, boolean>;

  const cleanNotes = notes.replace(match[0], '').trim();

  return {
    cleanNotes,
    attendCeremony: guest.invited_to_ceremony ? (map['ceremony'] ?? true) : false,
    attendReception: guest.invited_to_reception ? (map['reception'] ?? true) : false,
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
  const activeLookupRequestRef = useRef(0);
  const activeSubmitRequestRef = useRef(0);
  const [activePredictionIndex, setActivePredictionIndex] = useState(-1);
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [rsvpQuestions, setRsvpQuestions] = useState<RSVPQuestion[]>([]);
  const [customAnswers, setCustomAnswers] = useState<Record<string, string | string[]>>({});
  const [mealConfig, setMealConfig] = useState<RSVPMealConfig>(DEFAULT_MEAL_CONFIG);
  const [householdGuests, setHouseholdGuests] = useState<HouseholdGuest[]>([]);
  const [applyToHousehold, setApplyToHousehold] = useState(true);
  const [selectedHouseholdGuestIds, setSelectedHouseholdGuestIds] = useState<string[]>([]);

  const invalidateActiveSubmit = useCallback(() => {
    activeSubmitRequestRef.current += 1;
    setLoading(false);
    setSubmitting(false);
  }, []);

  const resetToSearch = useCallback((preserveToken = false) => {
    activeLookupRequestRef.current += 1;
    invalidateActiveSubmit();
    setStep('search');
    setError('');
    setGuest(null);
    setExistingRsvp(null);
    setAmbiguousGuests([]);
    setRsvpDeadline(null);
    setMusicPlaylistUrl(null);
    setFormData({ attending: true, attendCeremony: true, attendReception: true, meal_choice: '', plus_one_name: '', notes: '' });
    setCustomAnswers({});
    setRsvpQuestions([]);
    setMealConfig(DEFAULT_MEAL_CONFIG);
    setHouseholdGuests([]);
    setApplyToHousehold(true);
    setSelectedHouseholdGuestIds([]);
    setFormStep(1);
    setActivePredictionIndex(-1);
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

  const returnToLoadedRsvp = useCallback(() => {
    invalidateActiveSubmit();
    setError('');
    setStep('form');
    setFormStep(1);
    setExistingRsvp({
      id: 'local-rsvp-confirmation',
      attending: formData.attending,
      attending_ceremony: formData.attendCeremony,
      attending_reception: formData.attendReception,
      meal_choice: formData.meal_choice || null,
      plus_one_name: formData.plus_one_name || null,
      notes: formData.notes || null,
      custom_answers: customAnswers,
    });
  }, [customAnswers, formData, invalidateActiveSubmit]);

  useEffect(() => {
    return () => {
      activeLookupRequestRef.current += 1;
      activeSubmitRequestRef.current += 1;
    };
  }, []);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      activeLookupRequestRef.current += 1;
      activeSubmitRequestRef.current += 1;
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
    setTokenAutoLoading(true);
    setSubmitting(false);
    setStep('search');
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
    (DEMO_MODE ? Promise.resolve({ data: demoLookup(token) as unknown, error: undefined as string | undefined }) : rsvpCall({ action: 'lookup', searchValue: token }))
      .then(({ data, error: err }) => {
        if (activeLookupRequestRef.current !== requestId) return;
        if (err || !data) {
          setError(err ?? 'Invalid invitation link. Please search by name below.');
          setTokenAutoLoading(false);
          return;
        }
        const result = data as { guest: Guest | null; existingRsvp: ExistingRSVP | null; guests: Guest[] | null; rsvpDeadline: string | null; rsvpQuestions?: RSVPQuestion[] | null; rsvpMealConfig?: RSVPMealConfig | null; musicPlaylistUrl?: string | null; householdGuests?: HouseholdGuest[] | null };
        if (result.guest) {
          selectGuest(result.guest, result.existingRsvp, result.rsvpDeadline, result.rsvpQuestions ?? [], result.rsvpMealConfig ?? { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] }, result.householdGuests ?? [], result.musicPlaylistUrl ?? null);
        } else if (result.guests && result.guests.length > 1) {
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
          setError('Invitation not recognized. Please search by name below.');
        }
      })
      .catch(() => {
        if (activeLookupRequestRef.current !== requestId) return;
        setError('Failed to load invitation. Please search by name below.');
      })
      .finally(() => {
        if (activeLookupRequestRef.current !== requestId) return;
        setTokenAutoLoading(false);
      });
  }, [searchParams]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const requestId = activeLookupRequestRef.current + 1;
    activeLookupRequestRef.current = requestId;
    invalidateActiveSubmit();
    setTokenAutoLoading(false);
    setLoading(true);
    setError('');
    setStep('search');
    setGuest(null);
    setExistingRsvp(null);
    setAmbiguousGuests([]);
    setRsvpDeadline(null);
    setMusicPlaylistUrl(null);
    setHouseholdGuests([]);
    setApplyToHousehold(true);
    setSelectedHouseholdGuestIds([]);

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
      if (activeLookupRequestRef.current !== requestId) return;
      setLoading(false);
    }
  };

  const selectGuest = (foundGuest: Guest, foundRsvp: ExistingRSVP | null, deadline: string | null = null, questions: RSVPQuestion[] = [], meal: RSVPMealConfig = { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] }, household: HouseholdGuest[] = [], playlistUrl: string | null = null) => {
    setGuest(foundGuest);
    setRsvpDeadline(deadline);
    setRsvpQuestions(questions);
    setMealConfig(meal);
    setMusicPlaylistUrl(playlistUrl);
    setHouseholdGuests(household);
    setApplyToHousehold(household.length > 0);
    setSelectedHouseholdGuestIds(household.map((h) => h.id));
    if (foundRsvp) {
      setExistingRsvp(foundRsvp);
      const parsed = parseEventSelectionsFromNotes(foundRsvp.notes, foundGuest);
      const attendCeremony = typeof foundRsvp.attending_ceremony === 'boolean' ? foundRsvp.attending_ceremony : parsed.attendCeremony;
      const attendReception = typeof foundRsvp.attending_reception === 'boolean' ? foundRsvp.attending_reception : parsed.attendReception;
      setFormData({
        attending: foundRsvp.attending,
        attendCeremony,
        attendReception,
        meal_choice: (() => {
          const current = foundRsvp.meal_choice || '';
          if (!current) return '';
          const match = meal.options.find((opt) => opt.toLowerCase() === current.toLowerCase());
          return match ?? current;
        })(),
        plus_one_name: foundRsvp.plus_one_name || '',
        notes: parsed.cleanNotes,
      });
      setCustomAnswers((foundRsvp.custom_answers && typeof foundRsvp.custom_answers === 'object') ? foundRsvp.custom_answers : {});
    }
    if (!foundRsvp) {
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
  };

  const handlePickGuest = async (picked: Guest) => {
    const requestId = activeLookupRequestRef.current + 1;
    activeLookupRequestRef.current = requestId;
    invalidateActiveSubmit();
    setLoading(true);
    setError('');
    try {
      const lookupResp: { data?: unknown; error?: string } = DEMO_MODE
        ? { data: demoLookup(picked.invite_token ?? picked.id) as unknown }
        : await rsvpCall({ action: 'lookup', searchValue: picked.invite_token ?? picked.id });
      const data = lookupResp.data;
      const err = lookupResp.error;
      if (err || !data) {
        if (activeLookupRequestRef.current !== requestId) return;
        selectGuest(picked, null, rsvpDeadline, rsvpQuestions, mealConfig, householdGuests, musicPlaylistUrl);
        return;
      }
      const result = data as { guest: Guest | null; existingRsvp: ExistingRSVP | null; guests: Guest[] | null; rsvpDeadline: string | null; rsvpQuestions?: RSVPQuestion[] | null; rsvpMealConfig?: RSVPMealConfig | null; musicPlaylistUrl?: string | null; householdGuests?: HouseholdGuest[] | null };
      if (activeLookupRequestRef.current !== requestId) return;
      selectGuest(result.guest ?? picked, result.existingRsvp, result.rsvpDeadline, result.rsvpQuestions ?? [], result.rsvpMealConfig ?? { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] }, result.householdGuests ?? [], result.musicPlaylistUrl ?? null);
    } catch {
      if (activeLookupRequestRef.current !== requestId) return;
      selectGuest(picked, null, rsvpDeadline, rsvpQuestions, mealConfig, householdGuests, musicPlaylistUrl);
    } finally {
      if (activeLookupRequestRef.current !== requestId) return;
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const requestId = activeSubmitRequestRef.current + 1;
    activeSubmitRequestRef.current = requestId;
    setLoading(true);
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
        setError('Your invitation is missing a secure token. Please use the RSVP link from your invitation email.');
        return;
      }

      if (formData.attending && guest.invited_to_ceremony && guest.invited_to_reception && !formData.attendCeremony && !formData.attendReception) {
        if (activeSubmitRequestRef.current !== requestId) return;
        setError('Please choose at least one event from your invitation, or mark not attending.');
        return;
      }

      const notesPayload = (formData.notes || '').trim();

      if (applyToHousehold && householdGuests.length > 0 && selectedHouseholdGuestIds.length === 0) {
        if (activeSubmitRequestRef.current !== requestId) return;
        setError('Pick at least one household guest to share this RSVP with, or turn inheritance off.');
        return;
      }

      if (DEMO_MODE) {
        const stored = getDemoStoredResponses();
        const payload: ExistingRSVP = {
          id: `demo-rsvp-${guest.id}`,
          attending: formData.attending,
          attending_ceremony: formData.attendCeremony,
          attending_reception: formData.attendReception,
          meal_choice: formData.meal_choice || null,
          plus_one_name: formData.plus_one_name || null,
          plus_one_count: formData.plus_one_name.trim() ? 1 : 0,
          children_count: 0,
          notes: notesPayload || null,
          custom_answers: customAnswers,
        };
        const targetIds = applyToHousehold ? [guest.id, ...selectedHouseholdGuestIds] : [guest.id];
        targetIds.forEach((id) => { stored[id] = { ...payload, id: `demo-rsvp-${id}` }; });
        localStorage.setItem(DEMO_RSVP_RESPONSES_KEY, JSON.stringify(stored));
        if (activeSubmitRequestRef.current !== requestId) return;
        setExistingRsvp(payload);
        setStep('success');
        return;
      }

      const targetGuestIds = applyToHousehold
        ? [guest.id, ...selectedHouseholdGuestIds]
        : [guest.id];

      const { data, error: err } = await rsvpCall({
        action: 'submit',
        guestId: guest.id,
        inviteToken: guest.invite_token,
        attending: formData.attending,
        attendCeremony: formData.attendCeremony,
        attendReception: formData.attendReception,
        mealChoice: formData.meal_choice || null,
        plusOneName: formData.plus_one_name || null,
        plusOneCount: formData.plus_one_name.trim() ? 1 : 0,
        childrenCount: 0,
        notes: notesPayload || null,
        customAnswers,
        applyToHousehold,
        targetGuestIds,
      });

      if (err) {
        if (activeSubmitRequestRef.current !== requestId) return;
        setError(err);
        return;
      }

      if (activeSubmitRequestRef.current !== requestId) return;
      setStep('success');
    } catch {
      if (activeSubmitRequestRef.current !== requestId) return;
      setError('Failed to submit RSVP. Please try again.');
    } finally {
      if (activeSubmitRequestRef.current !== requestId) return;
      setLoading(false);
    }
  };

  const guestDisplayName = guest
    ? guest.first_name && guest.last_name
      ? `${guest.first_name} ${guest.last_name}`
      : guest.name
    : '';

  const deadlinePassed = rsvpDeadline ? new Date(rsvpDeadline) < new Date() : false;

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
        setError(`Please answer: ${requiredMissing.label}`);
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
                  onChange={(e) => setSearchValue(e.target.value)}
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
                      setSearchValue(guestPredictions[activePredictionIndex]);
                    }
                  }}
                  placeholder={t('rsvp.search_placeholder')}
                  className="h-11"
                  required
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Use the invitation code from your email for the fastest lookup
                </p>
                {guestPredictions.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg bg-white overflow-hidden">
                    {guestPredictions.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setSearchValue(name)}
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
              onClick={() => { resetToSearch(true); }}
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
                  <p className="mt-0.5">The deadline was {new Date(rsvpDeadline!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Please contact the couple directly.</p>
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
                      onChange={(e) => setFormData({ ...formData, attending: e.target.value === 'yes' })}
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
                        <input type="checkbox" checked={applyToHousehold} onChange={(e) => setApplyToHousehold(e.target.checked)} className="w-5 h-5 mt-0.5" />
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
                                onClick={() => setSelectedHouseholdGuestIds(householdGuests.map((h) => h.id))}
                                className="text-xs px-3 py-2 rounded-lg border border-amber-300 text-amber-900 hover:bg-amber-100"
                              >
                                Select all
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedHouseholdGuestIds([])}
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
                                          setSelectedHouseholdGuestIds((prev) => e.target.checked ? [...new Set([...prev, h.id])] : prev.filter((id) => id !== h.id));
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
                                onChange={(e) => setFormData({ ...formData, attendCeremony: e.target.checked })}
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
                                onChange={(e) => setFormData({ ...formData, attendReception: e.target.checked })}
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
                            onChange={(e) => setFormData({ ...formData, meal_choice: e.target.value })}
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
                            onChange={(e) => setFormData({ ...formData, plus_one_name: e.target.value })}
                            placeholder="Guest's full name"
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
                            <label className="block text-base font-medium text-gray-900">{q.label}{q.required ? ' *' : ''}</label>
                            {q.type === 'long_text' ? (
                              <Textarea
                                value={customAnswers[q.id] ?? ''}
                                onChange={(e) => setCustomAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
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
                                            setCustomAnswers((prev) => {
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
                                              setCustomAnswers((prev) => ({ ...prev, [q.id]: opt }));
                                            } else {
                                              setCustomAnswers((prev) => ({ ...prev, [q.id]: '' }));
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
                                onChange={(e) => setCustomAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
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
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                          <span className="text-gray-700 font-semibold flex-shrink-0">{q.label}</span>
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
                      setFormStep((formStep - 1) as 1 | 2 | 3);
                    } else {
                      setStep('search');
                      setError('');
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
                    disabled={loading || !canSubmit}
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
