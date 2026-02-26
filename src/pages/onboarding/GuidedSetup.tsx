import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowRight, ArrowLeft, Check, Sparkles, Palette, Layout, Download, Upload, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button, Card, Input, Textarea } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { buildOnboardingUpdateData } from '../../lib/onboardingMapper';
import * as XLSX from 'xlsx';

type Step =
  | 'welcome'
  | 'basics'
  | 'events'
  | 'travel'
  | 'rsvp'
  | 'faq'
  | 'design'
  | 'guests'
  | 'complete';

interface FormData {
  weddingDate: string;
  venue: string;
  city: string;
  ourStory: string;
  ceremonyTime: string;
  receptionTime: string;
  attire: string;
  hotelRecommendations: string;
  parking: string;
  rsvpDeadline: string;
  mealOptions: string;
  registryLinks: string;
  customFaqs: string;
  template: string;
  colorScheme: string;
}

const deriveCityFromAddress = (address?: string | null): string => {
  if (!address) return '';
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length >= 3) return parts[parts.length - 3] || '';
  if (parts.length >= 2) return parts[parts.length - 2] || '';
  return '';
};

export const GuidedSetup: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coupleNames, setCoupleNames] = useState({ name1: '', name2: '' });
  const [formData, setFormData] = useState<FormData>({
    weddingDate: '',
    venue: '',
    city: '',
    ourStory: '',
    ceremonyTime: '',
    receptionTime: '',
    attire: '',
    hotelRecommendations: '',
    parking: '',
    rsvpDeadline: '',
    mealOptions: '',
    registryLinks: '',
    customFaqs: '',
    template: 'modern',
    colorScheme: 'romantic',
  });

  const [csvImportResult, setCsvImportResult] = useState<{ created: number; updated: number; invalid: number } | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvError, setCsvError] = useState('');

  const steps: Step[] = ['welcome', 'basics', 'events', 'travel', 'rsvp', 'faq', 'design', 'guests', 'complete'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  useEffect(() => {
    const fetchWeddingSite = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('wedding_sites')
        .select('couple_name_1, couple_name_2, wedding_date, venue_date, venue_name, venue_address, wedding_location')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setCoupleNames({
          name1: data.couple_name_1 || '',
          name2: data.couple_name_2 || '',
        });
        const hydratedCity = data.wedding_location || deriveCityFromAddress(data.venue_address);

        setFormData(prev => ({
          ...prev,
          weddingDate: data.wedding_date || data.venue_date || '',
          venue: data.venue_name || '',
          city: hydratedCity || '',
        }));
      }
    };

    fetchWeddingSite();
  }, []);

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

  const persistSectionProgress = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const updateData = buildOnboardingUpdateData({
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

    const { error: updateError } = await supabase
      .from('wedding_sites')
      .update(updateData)
      .eq('user_id', user.id);

    if (updateError) throw updateError;
  };

  const handleNext = async () => {
    try {
      setError('');
      if (!['welcome', 'complete'].includes(currentStep)) {
        await persistSectionProgress();
      }

      const nextIndex = currentStepIndex + 1;
      if (nextIndex < steps.length) {
        setCurrentStep(steps[nextIndex]);
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Could not save this step. Please try again.');
    }
  };

  const handleBack = () => {
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updateData = buildOnboardingUpdateData({
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

      const { error: updateError } = await supabase
        .from('wedding_sites')
        .update(updateData)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      navigate('/dashboard', {
        state: {
          showWelcome: true,
        }
      });
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to save. Please try again.');
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

      let rows: string[][] = [];
      if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) throw new Error('Spreadsheet has no sheets');
        const firstSheet = workbook.Sheets[firstSheetName];
        rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as string[][];
      } else {
        const text = await file.text();
        rows = text
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean)
          .map(l => l.split(',').map(v => v.trim().replace(/^"|"$/g, '')));
      }

      if (rows.length < 2) throw new Error('File must have a header row and at least one guest row');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: site } = await supabase
        .from('wedding_sites')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!site) throw new Error('Wedding site not found');

      const cols = (rows[0] || []).map((h) => String(h ?? '').toLowerCase().trim());

      const findIdx = (...candidates: string[]) => {
        for (const c of candidates) {
          const i = cols.indexOf(c);
          if (i >= 0) return i;
        }
        return -1;
      };

      const firstNameIdx = findIdx('first_name', 'firstname', 'first name', 'given_name', 'given name');
      const lastNameIdx = findIdx('last_name', 'lastname', 'last name', 'surname', 'family_name', 'family name');
      const fullNameIdx = findIdx('name', 'full_name', 'full name', 'guest_name', 'guest name', 'last, first', 'last first');
      const emailIdx = findIdx('email', 'email_address', 'email address');
      const phoneIdx = findIdx('phone', 'phone_number', 'phone number', 'mobile', 'cell');
      const groupIdx = findIdx('group_name', 'group', 'household', 'party', 'family');
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

        const name = [firstName, lastName].filter(Boolean).join(' ') || email || 'Guest';

        if (email) {
          const { data: existing } = await supabase
            .from('guests')
            .select('id')
            .eq('wedding_site_id', site.id)
            .eq('email', email)
            .maybeSingle();

          if (existing) {
            await supabase.from('guests').update({
              first_name: firstName || null,
              last_name: lastName || null,
              phone: phone || null,
              group_name: groupName,
              plus_one_allowed: plusOne,
              invited_to_ceremony: toCeremony,
              invited_to_reception: toReception,
            }).eq('id', existing.id);
            updated++;
            continue;
          }
        }

        await supabase.from('guests').insert({
          wedding_site_id: site.id,
          name,
          first_name: firstName || null,
          last_name: lastName || null,
          email: email || null,
          phone: phone || null,
          group_name: groupName,
          plus_one_allowed: plusOne,
          invited_to_ceremony: toCeremony,
          invited_to_reception: toReception,
          rsvp_status: 'pending',
        });
        created++;
      }

      setCsvImportResult({ created, updated, invalid });
    } catch (err: unknown) {
      setCsvError((err as Error).message || 'Failed to import guest file');
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
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-4">
                <Heart className="w-10 h-10 text-primary" fill="currentColor" aria-hidden="true" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-3">
                Let's Build Your Wedding Site
              </h2>
              <p className="text-text-secondary max-w-md mx-auto">
                We'll walk through each section step-by-step. Skip anything you're not ready for - you can always come back later.
              </p>
            </div>

            <div className="bg-surface-subtle rounded-lg p-6">
              <h3 className="font-semibold text-text-primary mb-4">What we'll cover:</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Wedding Basics</p>
                    <p className="text-sm text-text-secondary">Date, location, your story</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Events & Schedule</p>
                    <p className="text-sm text-text-secondary">Ceremony, reception, timeline</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Travel & Accommodations</p>
                    <p className="text-sm text-text-secondary">Hotels, parking, getting around</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">4</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">RSVP Details</p>
                    <p className="text-sm text-text-secondary">Deadline, meal choices</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">5</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Registry</p>
                    <p className="text-sm text-text-secondary">Add your registry links</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">6</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">FAQ</p>
                    <p className="text-sm text-text-secondary">Common questions answered</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">7</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Template & Design</p>
                    <p className="text-sm text-text-secondary">Choose your style and colors</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
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
              Let's Get Started
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

            <div className="p-4 bg-surface-subtle rounded-lg">
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

            <Textarea
              label="Your Story (Optional)"
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
              helperText="Optional - skip if not ready"
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

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-primary">Tip:</span> You can add more events and details from your dashboard later
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
              helperText="Optional - you can skip this for now"
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

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-primary">Note:</span> You can add airport info, transportation options, and local attractions from your dashboard
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
              label="Meal Options (Optional)"
              name="mealOptions"
              value={formData.mealOptions}
              onChange={handleChange}
              placeholder="e.g., Chicken, Beef, Vegetarian"
              rows={3}
              helperText="Leave blank if not offering meal choices"
            />

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-primary">Tip:</span> You can manage all RSVPs and view real-time responses from your guest list dashboard
              </p>
            </div>
          </div>
        );


      case 'faq':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">FAQ</h2>
              <p className="text-text-secondary">Answer common questions</p>
            </div>

            <div className="p-4 bg-surface-subtle rounded-lg">
              <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
                Suggested FAQs we'll add:
              </h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>What should I wear?</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Can I bring a plus one?</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Will there be parking?</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Is the wedding indoors or outdoors?</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Will the ceremony and reception be at the same location?</span>
                </li>
              </ul>
            </div>

            <Textarea
              label="Add Your Own Questions (Optional)"
              name="customFaqs"
              value={formData.customFaqs}
              onChange={handleChange}
              placeholder="Add any specific questions you want to answer..."
              rows={4}
              helperText="You can edit all FAQs from your dashboard"
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
                    onClick={() => setFormData(prev => ({ ...prev, template: tpl.id }))}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.template === tpl.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="aspect-[3/4] bg-surface-subtle rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      <div className="space-y-1.5 w-full px-3">
                        <div className="h-2 bg-primary/20 rounded-full w-full" />
                        <div className="h-1.5 bg-border rounded-full w-3/4" />
                        <div className="h-4 bg-primary/10 rounded mt-2" />
                        <div className="h-1.5 bg-border rounded-full w-full" />
                        <div className="h-1.5 bg-border rounded-full w-2/3" />
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
                  { id: 'custom', label: 'Create your own', colors: ['#FFFFFF', '#CCCCCC', '#333333'], description: 'Create your own' },
                ].map((scheme) => (
                  <button
                    key={scheme.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, colorScheme: scheme.id }))}
                    className={`p-4 rounded-lg border-2 transition-all ${
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
                <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm text-text-secondary">
                    <span className="font-medium text-primary">Custom palette:</span> You'll be able to choose your own colors from the builder after setup
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
              <p className="text-text-secondary">Start with a CSV, or skip and add guests manually later</p>
            </div>

            <div className="p-4 bg-surface-subtle rounded-lg space-y-3">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" aria-hidden="true" />
                Step 1: Download the template
              </h3>
              <p className="text-sm text-text-secondary">
                Fill in guest names, emails, phone numbers, group names, and which events they're invited to.
              </p>
              <div className="bg-surface rounded-lg border border-border p-3 font-mono text-xs text-text-tertiary overflow-x-auto">
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
                Step 2: Upload your guest file (CSV or XLSX)
              </h3>
              {csvImportResult ? (
                <div className="p-4 bg-success/10 border border-success/30 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 font-medium text-success">
                    <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                    Import complete
                  </div>
                  <ul className="text-sm text-text-secondary space-y-1">
                    <li>{csvImportResult.created} guests added</li>
                    {csvImportResult.updated > 0 && <li>{csvImportResult.updated} guests updated</li>}
                    {csvImportResult.invalid > 0 && <li className="text-warning">{csvImportResult.invalid} rows skipped (missing name/email)</li>}
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
                  <div className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${csvImporting ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    {csvImporting ? (
                      <div className="space-y-2">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm text-text-secondary">Importing guests...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-text-tertiary mx-auto mb-3" aria-hidden="true" />
                        <p className="text-sm font-medium text-text-primary mb-1">Click to upload CSV or XLSX</p>
                        <p className="text-xs text-text-tertiary">Supports template CSV/XLSX or most common guest file headers (name/email/phone/group, etc.)</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    className="hidden"
                    onChange={handleCsvUpload}
                    disabled={csvImporting}
                  />
                </label>
              )}
              {csvError && (
                <div className="flex items-start gap-2 p-3 bg-error/10 border border-error/30 rounded-lg text-sm text-error">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  {csvError}
                </div>
              )}
            </div>

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-primary">Skip this step</span> if you're not ready. You can add and manage guests individually from the Guests dashboard at any time.
              </p>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-accent/20 rounded-full mb-4">
              <Check className="w-10 h-10 text-accent" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-3">
              You're All Set!
            </h2>
            <p className="text-text-secondary max-w-md mx-auto mb-6">
              Your wedding site is ready. We've created all your pages with the information you provided. You can edit everything from your dashboard.
            </p>

            <div className="bg-surface-subtle rounded-lg p-6 text-left">
              <h3 className="font-semibold text-text-primary mb-4">What's next?</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Preview your site</p>
                    <p className="text-sm text-text-secondary">See how it looks to your guests</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Add your guests</p>
                    <p className="text-sm text-text-secondary">Start building your guest list</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Customize & publish</p>
                    <p className="text-sm text-text-secondary">Make it yours and share with guests</p>
                  </div>
                </li>
              </ul>
            </div>

            {error && (
              <div className="p-3 bg-error-light text-error rounded-lg text-sm">
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
              {loading ? 'Creating Your Site...' : 'Go to Dashboard'}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-surface-subtle to-surface p-4">
      <div className="w-full max-w-2xl">
        {currentStep !== 'welcome' && (
          <div className="mb-4 flex items-center justify-start">
            <button
              type="button"
              onClick={() => {
                if (currentStep === 'complete') {
                  navigate('/onboarding/celebration');
                  return;
                }
                if (currentStepIndex <= 1) {
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
            <div className="w-full h-2 bg-surface-subtle rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <Card variant="default" padding="lg" className="shadow-lg">
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
            onClick={() => navigate('/onboarding/celebration')}
            className="w-full text-center text-sm text-text-secondary hover:text-text-primary transition-colors mt-4"
          >
            ← Back to options
          </button>
        )}
      </div>
    </div>
  );
};
