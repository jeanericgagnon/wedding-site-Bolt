import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowRight, ArrowLeft, Check, Sparkles, Palette, Layout, Download, Upload, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button, Card, Input, Textarea } from '../../components/ui';
import { buildOnboardingUpdateWithClarifying } from '../../lib/buildOnboardingUpdateWithClarifying';
import { buildSuggestedFaqDrafts } from '../../lib/faqDraftHelper';
import { buildWelcomeNoteDraft } from '../../lib/welcomeNoteHelper';
import { findCsvHeaderIndex, normalizeCsvHeader } from '../../lib/csvHeaderMatcher';
import { clearGuidedSetupDraftSnapshot, persistGuidedSetupDraftSnapshot, readGuidedSetupDraftSnapshot } from '../../lib/guidedSetupPersistence';
import { clearAllOnboardingContinuationState } from '../../lib/onboardingContinuationCleanup';
import { resolvePrimaryWeddingSiteId } from '../../lib/guidedSetupSiteResolver';
import { writeSignupReturnPath } from '../../lib/signupContinuation';
import { clearOnboardingEntryReturnPath } from '../../lib/onboardingEntryCleanup';
import { buildGuidedSetupHydrationErrorMessage, buildGuidedSetupSaveErrorMessage } from '../../lib/guidedSetupErrorCopy';
import { customerSafeErrorMessage } from '../../lib/customerSafeError';
import { useAuth } from '../../hooks/useAuth';
import {
  createEmptyGuidedSetupFormData,
  createGuidedSetupDraftDefaults,
  guidedSetupSteps,
  type GuidedSetupFormData,
  type GuidedSetupStep,
} from './guidedSetupContent';
import {
  fetchGuidedSetupSite,
  requireAuthenticatedOnboardingUser,
  updateGuidedSetupSite,
  upsertGuidedSetupGuestFromCsv,
} from './onboardingService';

const deriveCityFromAddress = (address?: string | null): string => {
  if (!address) return '';
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length >= 3) return parts[parts.length - 3] || '';
  if (parts.length >= 2) return parts[parts.length - 2] || '';
  return '';
};

const normalizeHydratedDateInput = (value?: string | null): string => {
  const trimmed = value?.trim() ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return '';

  const date = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10) === trimmed ? trimmed : '';
};

export const safeGuidedSetupCsvError = (err: unknown): string => {
  return customerSafeErrorMessage(err, 'Couldn’t import that guest file. Please check the CSV and try again.', {
    allow: [/^Please export your spreadsheet as CSV before importing\.$/i],
  });
};

export const GuidedSetup: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const guidedSetupStorageScope = user?.id ?? null;
  const [currentStep, setCurrentStep] = useState<GuidedSetupStep>('welcome');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coupleNames, setCoupleNames] = useState({ name1: '', name2: '' });
  const [formData, setFormData] = useState<GuidedSetupFormData>(createEmptyGuidedSetupFormData());

  const [csvImportResult, setCsvImportResult] = useState<{ created: number; updated: number; invalid: number } | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvError, setCsvError] = useState('');
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [hasLocalDraft, setHasLocalDraft] = useState(false);

  const steps = guidedSetupSteps;


  const activeUseCasePacks = [
    formData.template === 'destination' ? 'destination' : null,
    formData.template === 'bilingual' ? 'bilingual' : null,
    formData.template === 'interfaith' ? 'interfaith' : null,
  ].filter(Boolean) as string[];

  const welcomeNoteDraft = buildWelcomeNoteDraft({
    partner1Name: coupleNames.name1,
    partner2Name: coupleNames.name2,
    city: formData.city,
    venue: formData.venue,
    useCasePacks: activeUseCasePacks,
  });

  const suggestedFaqDrafts = buildSuggestedFaqDrafts({
    weddingCity: formData.city,
    venue: formData.venue,
    attire: formData.attire,
    parking: formData.parking,
    hotelRecommendations: formData.hotelRecommendations,
    rsvpDeadline: formData.rsvpDeadline,
    useCasePacks: activeUseCasePacks,
  });
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const guidedSetupDefaults = useMemo(() => createGuidedSetupDraftDefaults(), []);

  useEffect(() => {
    clearOnboardingEntryReturnPath(guidedSetupStorageScope);
  }, [guidedSetupStorageScope]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setHasHydratedDraft(true);
      return;
    }

    const saved = readGuidedSetupDraftSnapshot(guidedSetupDefaults, guidedSetupStorageScope);
    if (!saved) {
      setHasLocalDraft(false);
      setHasHydratedDraft(true);
      return;
    }

    try {
      setHasLocalDraft(true);
      setCurrentStep(saved.currentStep);
      setCoupleNames(saved.coupleNames);
      setFormData(saved.formData);
    } catch {
      clearGuidedSetupDraftSnapshot(guidedSetupStorageScope);
    } finally {
      setHasHydratedDraft(true);
    }
  }, [guidedSetupDefaults, guidedSetupStorageScope]);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasHydratedDraft || currentStep === 'complete') return;
    persistGuidedSetupDraftSnapshot({ currentStep, coupleNames, formData }, guidedSetupDefaults, guidedSetupStorageScope);
  }, [currentStep, coupleNames, formData, guidedSetupDefaults, guidedSetupStorageScope, hasHydratedDraft]);

  useEffect(() => {
    const fetchWeddingSite = async () => {
      try {
        const user = await requireAuthenticatedOnboardingUser();

        const resolvedSiteId = await resolvePrimaryWeddingSiteId(user.id);
        setSiteId(resolvedSiteId);
        if (!resolvedSiteId) return;

        const data = await fetchGuidedSetupSite(user.id);

        if (data) {
          setCoupleNames((prev) => ({
          name1: prev.name1 || data.couple_name_1 || '',
          name2: prev.name2 || data.couple_name_2 || '',
        }));
        const hydratedCity = data.wedding_location || deriveCityFromAddress(data.venue_address);
        const hydratedWeddingDate = normalizeHydratedDateInput(data.wedding_date)
          || normalizeHydratedDateInput(data.venue_date);

          setFormData(prev => ({
            ...prev,
            weddingDate: prev.weddingDate || hydratedWeddingDate,
            venue: prev.venue || data.venue_name || '',
            city: prev.city || hydratedCity || '',
          }));
        }
      } catch (err: unknown) {
        if (!hasLocalDraft) {
          setError(buildGuidedSetupHydrationErrorMessage(err));
        }
      }
    };

    void fetchWeddingSite();
  }, [hasLocalDraft]);


  const clearGuidedSetupDraft = () => {
    clearGuidedSetupDraftSnapshot(guidedSetupStorageScope);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'weddingDate' && value) {
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        setError('Wedding date must be in the future');
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const updateFormData = (patch: Partial<typeof formData>) => {
    setError('');
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const persistSectionProgress = async () => {
    const user = await requireAuthenticatedOnboardingUser();

    const updateData = buildOnboardingUpdateWithClarifying({
      coupleNames,
      planningStatus: 'guided_setup_in_progress',
      template: formData.template,
      colorScheme: formData.colorScheme,
      weddingDate: formData.weddingDate,
      venue: formData.venue,
      city: formData.city,
      ourStory: formData.ourStory,
      ceremonyTime: formData.ceremonyTime,
      receptionTime: formData.receptionTime,
      attire: formData.attire,
      hotelRecommendations: formData.hotelRecommendations,
      parking: formData.parking,
      rsvpDeadline: formData.rsvpDeadline,
      registryLinks: formData.registryLinks,
      customFaqs: formData.customFaqs,
    });

    const resolvedSiteId = siteId || await resolvePrimaryWeddingSiteId(user.id);
    if (!resolvedSiteId) throw new Error('Couldn’t find your wedding site right now.');

    await updateGuidedSetupSite({ siteId: resolvedSiteId, userId: user.id, updateData });
  };

  const handleNext = async () => {
    try {
      setError('');
      if (!['welcome', 'complete'].includes(currentStep)) {
        await persistSectionProgress();
      }

      const nextIndex = currentStepIndex + 1;
      if (nextIndex < steps.length) {
        const nextStep = steps[nextIndex];
        if (nextStep === 'complete') {
          clearGuidedSetupDraft();
        }
        setCurrentStep(nextStep);
      }
    } catch (err: unknown) {
        setError(buildGuidedSetupSaveErrorMessage(err));
    }
  };

  const handleBack = () => {
    setError('');
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const handleSkip = async () => {
    await handleNext();
  };

  const handleComplete = async () => {
    setLoading(true);
    setError('');

    try {
      const user = await requireAuthenticatedOnboardingUser();

      const updateData = buildOnboardingUpdateWithClarifying({
        coupleNames,
        planningStatus: 'guided_setup_complete',
        template: formData.template,
        colorScheme: formData.colorScheme,
        weddingDate: formData.weddingDate,
        venue: formData.venue,
        city: formData.city,
        ourStory: formData.ourStory,
        ceremonyTime: formData.ceremonyTime,
        receptionTime: formData.receptionTime,
        attire: formData.attire,
        hotelRecommendations: formData.hotelRecommendations,
        parking: formData.parking,
        rsvpDeadline: formData.rsvpDeadline,
        registryLinks: formData.registryLinks,
        customFaqs: formData.customFaqs,
      });

      const resolvedSiteId = siteId || await resolvePrimaryWeddingSiteId(user.id);
      if (!resolvedSiteId) throw new Error('Couldn’t find your wedding site right now.');

      await updateGuidedSetupSite({ siteId: resolvedSiteId, userId: user.id, updateData });

      clearAllOnboardingContinuationState(guidedSetupStorageScope);
      navigate('/dashboard', {
        state: {
          showWelcome: true,
        }
      });
    } catch (err: unknown) {
        setError(buildGuidedSetupSaveErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const downloadCsvTemplate = () => {
    const headers = 'first_name,last_name,email,phone,group_name,plus_one_allowed,invited_to_ceremony,invited_to_reception';
    const example1 = 'Jane,Smith,jane@example.com,555-0100,Smith Family,true,true,true';
    const example2 = 'John,Smith,john@example.com,555-0101,Smith Family,false,true,true';
    const example3 = 'Alice,Johnson,alice@example.com,,College Friends,true,false,true';
    const csv = [headers, example1, example2, example3].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guest-list-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError('');
    setCsvImporting(true);
    try {
      const lowerName = file.name.toLowerCase();

      if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        throw new Error('Please export your spreadsheet as CSV before importing.');
      }

      const text = await file.text();
      const rows = text
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .map(l => l.split(',').map(v => v.trim().replace(/^"|"$/g, '')));

      if (rows.length < 2) throw new Error('File must have a header row and at least one guest row');

      const user = await requireAuthenticatedOnboardingUser();

      const resolvedSiteId = siteId || await resolvePrimaryWeddingSiteId(user.id);
      if (!resolvedSiteId) throw new Error('Couldn’t find your wedding site right now.');

      const cols = (rows[0] || []).map((h) => normalizeCsvHeader(String(h ?? '')));

      const findIdx = (...candidates: string[]) => findCsvHeaderIndex(cols, ...candidates);

      const firstNameIdx = findIdx('first_name', 'firstname', 'first name', 'given_name', 'given name');
      const lastNameIdx = findIdx('last_name', 'lastname', 'last name', 'surname', 'family_name', 'family name');
      const fullNameIdx = findIdx('name', 'full_name', 'full name', 'guest_name', 'guest name', 'last, first', 'last first');
      const emailIdx = findIdx('email', 'email_address', 'email address', 'primary email', 'guest email');
      const phoneIdx = findIdx('phone', 'phone_number', 'phone number', 'mobile', 'mobile number', 'cell', 'guest phone');
      const groupIdx = findIdx('group_name', 'group', 'group name', 'household', 'household name', 'party', 'party name', 'family', 'family name');
      const plusOneIdx = findIdx('plus_one_allowed', 'plus_one', 'plus one', 'plusone');
      const ceremonyIdx = findIdx('invited_to_ceremony', 'ceremony', 'invite_ceremony');
      const receptionIdx = findIdx('invited_to_reception', 'reception', 'invite_reception');

      let created = 0;
      let updated = 0;
      let invalid = 0;

      for (const row of rows.slice(1)) {
        const vals = (row || []).map((v) => String(v ?? '').trim());

        let firstName = firstNameIdx >= 0 ? (vals[firstNameIdx] || '') : '';
        let lastName = lastNameIdx >= 0 ? (vals[lastNameIdx] || '') : '';

        if ((!firstName && !lastName) && fullNameIdx >= 0) {
          const full = (vals[fullNameIdx] || '').trim();

          // Support "Last, First" and "First Last" formats.
          if (full.includes(',')) {
            const [lastPart, firstPart] = full.split(',').map(p => p.trim());
            firstName = firstPart || '';
            lastName = lastPart || '';
          } else {
            const parts = full.split(/\s+/).filter(Boolean);
            if (parts.length > 0) {
              firstName = parts[0] || '';
              lastName = parts.slice(1).join(' ');
            }
          }
        }

        const email = emailIdx >= 0 ? (vals[emailIdx] || null) : null;
        const phone = phoneIdx >= 0 ? (vals[phoneIdx] || null) : null;
        const groupName = groupIdx >= 0 ? (vals[groupIdx] || null) : null;

        const plusOneRaw = plusOneIdx >= 0 ? (vals[plusOneIdx] || '') : '';
        const plusOne = ['true', 'yes', 'y', '1'].includes(plusOneRaw.toLowerCase());

        const ceremonyRaw = ceremonyIdx >= 0 ? (vals[ceremonyIdx] || '') : '';
        const toCeremony = !['false', 'no', 'n', '0'].includes(ceremonyRaw.toLowerCase());

        const receptionRaw = receptionIdx >= 0 ? (vals[receptionIdx] || '') : '';
        const toReception = !['false', 'no', 'n', '0'].includes(receptionRaw.toLowerCase());

        if (!firstName && !lastName && !email) { invalid++; continue; }

        const result = await upsertGuidedSetupGuestFromCsv(resolvedSiteId, {
          firstName,
          lastName,
          email: email || null,
          phone: phone || null,
          groupName,
          plusOne,
          invitedToCeremony: toCeremony,
          invitedToReception: toReception,
        });
        if (result === 'updated') updated++;
        else created++;
      }

      setCsvImportResult({ created, updated, invalid });
    } catch (err: unknown) {
      setCsvError(safeGuidedSetupCsvError(err));
    } finally {
      setCsvImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl border border-border-subtle bg-surface-raised mb-4">
                <Heart className="w-8 h-8 text-primary" fill="currentColor" aria-hidden="true" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-3">
                Let’s build your wedding website
              </h2>
              <p className="text-text-secondary max-w-md mx-auto">
                We’ll walk through each section step by step. Skip anything you’re not ready for and come back later.
              </p>
            </div>

            <div className="bg-surface-subtle rounded-xl border border-border-subtle p-6">
              <h3 className="font-semibold text-text-primary mb-4">What we'll cover:</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Wedding Basics</p>
                    <p className="text-sm text-text-secondary">Date, location, your story</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Events & Schedule</p>
                    <p className="text-sm text-text-secondary">Ceremony, reception, timeline</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Travel & Accommodations</p>
                    <p className="text-sm text-text-secondary">Hotels, parking, getting around</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">4</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">RSVP Details</p>
                    <p className="text-sm text-text-secondary">Deadline, meal choices</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">5</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Registry</p>
                    <p className="text-sm text-text-secondary">Add your registry links</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">6</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">FAQ</p>
                    <p className="text-sm text-text-secondary">Common questions answered</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">7</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Template & Design</p>
                    <p className="text-sm text-text-secondary">Choose your style and colors</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">8</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Guest List</p>
                    <p className="text-sm text-text-secondary">Import guests via CSV</p>
                  </div>
                </div>
              </div>
            </div>

            <Button variant="primary" size="lg" fullWidth onClick={handleNext}>
              Let’s get started
              <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
            </Button>
          </div>
        );

      case 'basics':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">Wedding Basics</h2>
              <p className="text-text-secondary">Tell us about your big day</p>
            </div>

            <div className="p-4 bg-surface-subtle rounded-xl">
              <p className="text-sm font-medium text-text-primary mb-1">Getting married:</p>
              <p className="text-lg font-semibold text-accent">
                {coupleNames.name1} & {coupleNames.name2}
              </p>
            </div>

            <Input
              label="Wedding Date"
              type="date"
              name="weddingDate"
              value={formData.weddingDate}
              onChange={handleChange}
              helperText="Leave blank if you haven't set a date"
            />

            <Input
              label="City or Location"
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="e.g., San Francisco, CA"
            />

            <Input
              label="Venue Name"
              type="text"
              name="venue"
              value={formData.venue}
              onChange={handleChange}
              placeholder="e.g., The Grand Hotel"
              helperText="Optional"
            />

            <div className="rounded-xl border border-border bg-surface-subtle/30 p-3 text-xs text-text-secondary">
              Grounded draft help: this uses the details you already entered and gives you a starting point. It does not overwrite anything unless you insert it.
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => updateFormData({ ourStory: welcomeNoteDraft })}
                className="rounded border border-border px-3 py-2 text-sm text-text-secondary hover:border-primary/40 hover:text-primary"
              >
                Insert welcome note draft
              </button>
            </div>

            <Textarea
              label="Your story (optional)"
              name="ourStory"
              value={formData.ourStory}
              onChange={handleChange}
              placeholder="How did you meet? What's your story?"
              rows={4}
              helperText="This will appear on your home page"
            />
          </div>
        );

      case 'events':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">Events & Schedule</h2>
              <p className="text-text-secondary">When are things happening?</p>
            </div>

            <Input
              label="Ceremony Time"
              type="time"
              name="ceremonyTime"
              value={formData.ceremonyTime}
              onChange={handleChange}
              helperText="Optional. Skip if you’re not ready yet."
            />

            <Input
              label="Reception Time"
              type="time"
              name="receptionTime"
              value={formData.receptionTime}
              onChange={handleChange}
              helperText="Optional"
            />

            <Input
              label="Dress Code / Attire"
              type="text"
              name="attire"
              value={formData.attire}
              onChange={handleChange}
              placeholder="e.g., Cocktail attire, Black tie optional"
              helperText="Optional"
            />

            <div className="p-4 bg-surface-subtle rounded-xl border border-border-subtle">
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-primary">Tip:</span> You can add more events and details from Schedule later
              </p>
            </div>
          </div>
        );

      case 'travel':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">Travel & Accommodations</h2>
              <p className="text-text-secondary">Help your guests get there</p>
            </div>

            <Textarea
              label="Hotel Recommendations"
              name="hotelRecommendations"
              value={formData.hotelRecommendations}
              onChange={handleChange}
              placeholder="List recommended hotels or add booking links..."
              rows={4}
              helperText="Optional. You can skip this for now."
            />

            <Textarea
              label="Parking Information"
              name="parking"
              value={formData.parking}
              onChange={handleChange}
              placeholder="Where should guests park? Any special instructions?"
              rows={3}
              helperText="Optional"
            />

            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-primary">Note:</span> You can add airport info, transportation options, and local favorites from Travel later
              </p>
            </div>
          </div>
        );

      case 'rsvp':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">RSVP Details</h2>
              <p className="text-text-secondary">Set up your RSVP page</p>
            </div>

            <Input
              label="RSVP Deadline"
              type="date"
              name="rsvpDeadline"
              value={formData.rsvpDeadline}
              onChange={handleChange}
              helperText="When do you need responses by?"
            />

            <Textarea
              label="Meal options (optional)"
              name="mealOptions"
              value={formData.mealOptions}
              onChange={handleChange}
              placeholder="e.g., Chicken, Beef, Vegetarian"
              rows={3}
              helperText="Leave blank if not offering meal choices"
            />

            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-primary">Tip:</span> You can manage RSVPs and review the latest responses from Guests later
              </p>
            </div>
          </div>
        );


      case 'faq':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">FAQ</h2>
              <p className="text-text-secondary">Answer the questions guests are most likely to ask</p>
            </div>

            <div className="rounded-xl border border-border bg-surface-subtle/30 p-3 text-xs text-text-secondary">
              Grounded draft help: these suggestions come from your venue, travel, RSVP, and use-case setup details. Insert them, then edit freely.
            </div>

            <div className="p-4 bg-surface-subtle rounded-xl">
              <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
                Suggested FAQs we'll add:
              </h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                {suggestedFaqDrafts.map((item) => (
                  <li key={item.question} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{item.question}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => updateFormData({ customFaqs: suggestedFaqDrafts.map((item) => `${item.question}::${item.answer}`).join('\n') })}
                className="rounded border border-border px-3 py-2 text-sm text-text-secondary hover:border-primary/40 hover:text-primary"
              >
                Insert suggested FAQs
              </button>
            </div>

            <Textarea
              label="Add your own questions (optional)"
              name="customFaqs"
              value={formData.customFaqs}
              onChange={handleChange}
              placeholder="Add any extra questions you want to answer for guests..."
              rows={4}
              helperText="You can edit all FAQs from the site editor"
            />
          </div>
        );

      case 'design':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">Design Your Site</h2>
              <p className="text-text-secondary">Choose your template and colors</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-3">
                <Layout className="w-4 h-4 inline mr-2" aria-hidden="true" />
                Template Style
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'base', name: 'Base', desc: 'Clean & simple, all essentials' },
                  { id: 'modern', name: 'Modern', desc: 'Gallery-first, minimal' },
                  { id: 'editorial', name: 'Editorial', desc: 'Story-focused, elegant' },
                  { id: 'classic', name: 'Classic', desc: 'Timeless, traditional' },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => updateFormData({ template: tpl.id })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.template === tpl.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="aspect-[3/4] bg-surface-subtle rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                      <div className="space-y-1.5 w-full px-3">
                        <div className="h-2 bg-primary/20 rounded w-full" />
                        <div className="h-1.5 bg-border rounded w-3/4" />
                        <div className="h-4 bg-primary/10 rounded mt-2" />
                        <div className="h-1.5 bg-border rounded w-full" />
                        <div className="h-1.5 bg-border rounded w-2/3" />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-text-primary">{tpl.name}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{tpl.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-3">
                <Palette className="w-4 h-4 inline mr-2" aria-hidden="true" />
                Color Palette
              </label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'romantic', label: 'Romantic', colors: ['#FFE5E5', '#FF9999', '#FF6B6B'], description: 'Soft pinks & reds' },
                  { id: 'ocean', label: 'Ocean', colors: ['#E0F7FA', '#4DD0E1', '#0097A7'], description: 'Blues & aquas' },
                  { id: 'garden', label: 'Garden', colors: ['#F1F8E9', '#AED581', '#689F38'], description: 'Fresh greens' },
                  { id: 'elegant', label: 'Elegant', colors: ['#F5F5F5', '#9E9E9E', '#424242'], description: 'Classic neutrals' },
                  { id: 'sunset', label: 'Sunset', colors: ['#FFF3E0', '#FFB74D', '#F57C00'], description: 'Warm oranges' },
                  { id: 'lavender', label: 'Lavender', colors: ['#F3E5F5', '#BA68C8', '#7B1FA2'], description: 'Purple hues' },
                  { id: 'custom', label: 'Create your own', colors: ['#FFFFFF', '#CCCCCC', '#333333'], description: 'Build your own palette' },
                ].map((scheme) => (
                  <button
                    key={scheme.id}
                    type="button"
                    onClick={() => updateFormData({ colorScheme: scheme.id })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.colorScheme === scheme.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex gap-2 mb-3">
                      {scheme.colors.map((color, i) => (
                        <div
                          key={i}
                          className="flex-1 h-10 rounded"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <p className="text-sm font-medium text-text-primary">{scheme.label}</p>
                    <p className="text-xs text-text-secondary mt-1">{scheme.description}</p>
                  </button>
                ))}
              </div>
              {formData.colorScheme === 'custom' && (
                <div className="mt-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
                  <p className="text-sm text-text-secondary">
                    <span className="font-medium text-primary">Custom palette:</span> You'll be able to choose your own colors from the site editor after setup
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 'guests':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">Import Your Guest List</h2>
              <p className="text-text-secondary">Start with a CSV, or skip and add guests yourself later</p>
            </div>

            <div className="p-4 bg-surface-subtle rounded-xl space-y-3">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" aria-hidden="true" />
                Step 1: Download the template
              </h3>
              <p className="text-sm text-text-secondary">
                Fill in guest names, emails, phone numbers, group names, and which events they're invited to.
              </p>
              <div className="bg-surface rounded-xl border border-border p-3 font-mono text-xs text-text-tertiary overflow-x-auto">
                first_name, last_name, email, phone, group_name, plus_one_allowed, invited_to_ceremony, invited_to_reception
              </div>
              <Button variant="outline" size="sm" onClick={downloadCsvTemplate}>
                <Download className="w-4 h-4 mr-2" aria-hidden="true" />
                Download CSV Template
              </Button>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" aria-hidden="true" />
                Step 2: Upload your guest file (CSV)
              </h3>
              {csvImportResult ? (
                <div className="p-4 bg-surface-secondary border border-border-subtle rounded-xl space-y-2">
                  <div className="flex items-center gap-2 font-medium text-text-primary">
                    <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                    Import complete
                  </div>
                  <ul className="text-sm text-text-secondary space-y-1">
                    <li>{csvImportResult.created} guests added</li>
                    {csvImportResult.updated > 0 && <li>{csvImportResult.updated} guests updated</li>}
                    {csvImportResult.invalid > 0 && <li className="text-text-secondary">{csvImportResult.invalid} rows need a name or email before import</li>}
                  </ul>
                  <button
                    type="button"
                    onClick={() => setCsvImportResult(null)}
                    className="text-xs text-text-tertiary hover:text-text-primary transition-colors underline"
                  >
                    Import another file
                  </button>
                </div>
              ) : (
                <label className="block">
                  <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${csvImporting ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    {csvImporting ? (
                      <div className="space-y-2">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-xl animate-spin mx-auto" />
                        <p className="text-sm text-text-secondary">Importing guests...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-text-tertiary mx-auto mb-3" aria-hidden="true" />
                        <p className="text-sm font-medium text-text-primary mb-1">Click to upload CSV</p>
                        <p className="text-xs text-text-tertiary">Supports the template CSV or most common guest file headers (name/email/phone/group, etc.)</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleCsvUpload}
                    disabled={csvImporting}
                  />
                </label>
              )}
              {csvError && (
                <div className="flex items-start gap-2 p-3 bg-surface-secondary border border-border-subtle rounded-xl text-sm text-text-secondary">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-text-tertiary" aria-hidden="true" />
                  {csvError}
                </div>
              )}
            </div>

            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-text-primary">Skip this step</span> if you’re not ready. You can always add and manage guests later from Guests.
              </p>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl border border-border-subtle bg-surface-raised mb-4">
              <Check className="w-8 h-8 text-primary" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-3">
              Your starter draft is ready to review
            </h2>
            <p className="text-text-secondary max-w-md mx-auto mb-6">
              We drafted the core pages from what you shared. Review the starter draft in your wedding home, tighten the details, and only publish once you're ready to share it with guests.
            </p>

            <div className="bg-surface-subtle rounded-xl p-6 text-left">
              <h3 className="font-semibold text-text-primary mb-4">What's next?</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Review your starter site</p>
                    <p className="text-sm text-text-secondary">Check the draft, fix details, and make sure it feels like you</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Add your guests</p>
                    <p className="text-sm text-text-secondary">Start building your guest list</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Review access, preview, and share when ready</p>
                    <p className="text-sm text-text-secondary">Set the guest-facing access you want, then share once the site feels solid</p>
                  </div>
                </li>
              </ul>
            </div>

            {error && (
              <div className="p-3 bg-surface-secondary border border-border-subtle text-text-secondary rounded-xl text-sm">
                {error}
              </div>
            )}

            <Button
              variant="accent"
              size="lg"
              fullWidth
              onClick={handleComplete}
              disabled={loading}
            >
              {loading ? 'Creating your wedding site...' : 'Continue to your wedding'}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        {currentStep !== 'welcome' && (
          <div className="mb-4 flex items-center justify-start">
            <button
              type="button"
              onClick={() => {
                if (currentStep === 'complete') {
                  clearGuidedSetupDraft();
                  navigate('/onboarding/celebration');
                  return;
                }
                if (currentStepIndex <= 1) {
                  clearGuidedSetupDraft();
                  navigate('/onboarding/celebration');
                  return;
                }
                handleBack();
              }}
              className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Back
            </button>
          </div>
        )}

        {currentStep !== 'welcome' && currentStep !== 'complete' && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-primary">
                Step {currentStepIndex} of {steps.length - 2}
              </span>
              <span className="text-sm text-text-secondary">
                {Math.round(progress)}% complete
              </span>
            </div>
            <div className="w-full h-2 bg-surface-subtle rounded-xl overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <Card variant="default" padding="lg">
          {renderStep()}

          {currentStep !== 'welcome' && currentStep !== 'complete' && (
            <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStepIndex === 1}
              >
                <ArrowLeft className="w-5 h-5 mr-2" aria-hidden="true" />
                Back
              </Button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Skip for now
                </button>
                <Button
                  variant="primary"
                  onClick={handleNext}
                >
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {(currentStep === 'welcome' || currentStep === 'complete') && (
          <button
            type="button"
            onClick={() => { clearGuidedSetupDraft(); navigate('/onboarding/celebration'); }}
            className="w-full text-center text-sm text-text-secondary hover:text-text-primary transition-colors mt-4"
          >
            ← Back to options
          </button>
        )}
      </div>
    </div>
  );
};
