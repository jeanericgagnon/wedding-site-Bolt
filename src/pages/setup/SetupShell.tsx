import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { templateCatalog } from '../../builder/constants/templateCatalog';

const steps = [
  { key: 'names', label: 'Couple names' },
  { key: 'date', label: 'Wedding date' },
  { key: 'location', label: 'Location' },
  { key: 'guest-estimate', label: 'Guest estimate' },
  { key: 'style', label: 'Style preferences' },
  { key: 'review', label: 'Review & generate' },
] as const;

const styleOptions = [
  'Modern',
  'Classic',
  'Floral',
  'Minimal',
  'Romantic',
  'Rustic',
  'Bold',
  'Destination',
] as const;

type SetupDraft = {
  partnerOneFirstName: string;
  partnerOneLastName: string;
  partnerTwoFirstName: string;
  partnerTwoLastName: string;
  dateKnown: boolean;
  weddingDate: string;
  weddingCity: string;
  weddingRegion: string;
  guestEstimateBand: '' | 'lt50' | '50to100' | '100to200' | '200plus';
  stylePreferences: string[];
  selectedTemplateId: string;
};

const DRAFT_KEY = 'dayof.builderV2.setupDraft';

const emptyDraft: SetupDraft = {
  partnerOneFirstName: '',
  partnerOneLastName: '',
  partnerTwoFirstName: '',
  partnerTwoLastName: '',
  dateKnown: true,
  weddingDate: '',
  weddingCity: '',
  weddingRegion: '',
  guestEstimateBand: '',
  stylePreferences: [],
  selectedTemplateId: 'modern-luxe',
};

const readDraft = (): SetupDraft => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return emptyDraft;
    const parsed = JSON.parse(raw) as Partial<SetupDraft>;
    return {
      ...emptyDraft,
      ...parsed,
      dateKnown: parsed.dateKnown ?? true,
      weddingDate: parsed.weddingDate ?? '',
      weddingCity: parsed.weddingCity ?? '',
      weddingRegion: parsed.weddingRegion ?? '',
      guestEstimateBand: (parsed.guestEstimateBand as SetupDraft['guestEstimateBand']) ?? '',
      stylePreferences: Array.isArray(parsed.stylePreferences) ? parsed.stylePreferences : [],
      selectedTemplateId: parsed.selectedTemplateId ?? localStorage.getItem('dayof.builderV2.selectedTemplate') ?? 'modern-luxe',
    };
  } catch {
    return emptyDraft;
  }
};

const writeDraft = (draft: SetupDraft) => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
};

export const SetupShell: React.FC<{ step?: string }> = ({ step }) => {
  const params = useParams();
  const navigate = useNavigate();
  const activeStep = step ?? params.step ?? 'names';

  const [draft, setDraft] = useState<SetupDraft>(() => readDraft());
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const completion = useMemo(() => {
    let score = 0;
    if (draft.partnerOneFirstName.trim() && draft.partnerTwoFirstName.trim()) score += 1;
    if (!draft.dateKnown || !!draft.weddingDate) score += 1;
    if (draft.weddingCity.trim()) score += 1;
    if (draft.guestEstimateBand) score += 1;
    if (draft.stylePreferences.length > 0) score += 1;
    return Math.round((score / 5) * 100);
  }, [draft]);

  const nextStep = useMemo(() => {
    const idx = steps.findIndex((s) => s.key === activeStep);
    if (idx < 0 || idx >= steps.length - 1) return null;
    return steps[idx + 1].key;
  }, [activeStep]);

  const prevStep = useMemo(() => {
    const idx = steps.findIndex((s) => s.key === activeStep);
    if (idx <= 0) return null;
    return steps[idx - 1].key;
  }, [activeStep]);

  const updateDraft = (patch: Partial<SetupDraft>) => {
    setError('');
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      writeDraft(next);
      return next;
    });
  };

  const goNext = () => {
    if (nextStep) navigate(`/setup/${nextStep}`);
  };

  const goPrev = () => {
    if (prevStep) navigate(`/setup/${prevStep}`);
  };

  const continueFromNames = () => {
    if (!draft.partnerOneFirstName.trim() || !draft.partnerTwoFirstName.trim()) {
      setError('Please enter first names for both partners.');
      return;
    }
    goNext();
  };

  const continueFromDate = () => {
    if (draft.dateKnown && !draft.weddingDate) {
      setError('Please select your wedding date or mark that you are still deciding.');
      return;
    }
    goNext();
  };

  const continueFromLocation = () => {
    if (!draft.weddingCity.trim()) {
      setError('Please enter your wedding city.');
      return;
    }
    goNext();
  };

  const continueFromGuestEstimate = () => {
    if (!draft.guestEstimateBand) {
      setError('Please choose a guest estimate range.');
      return;
    }
    goNext();
  };

  const toggleStyle = (style: string) => {
    const set = new Set(draft.stylePreferences);
    if (set.has(style)) set.delete(style);
    else set.add(style);
    updateDraft({ stylePreferences: Array.from(set) });
  };

  const continueFromStyle = () => {
    goNext();
  };

  const canOpenReview =
    draft.partnerOneFirstName.trim() &&
    draft.partnerTwoFirstName.trim() &&
    (!draft.dateKnown || !!draft.weddingDate) &&
    !!draft.weddingCity.trim() &&
    !!draft.guestEstimateBand;

  const selectedTemplateName = useMemo(() => {
    return templateCatalog.find((t) => t.id === draft.selectedTemplateId)?.name ?? draft.selectedTemplateId;
  }, [draft.selectedTemplateId]);

  const recommendedTemplates = useMemo(() => {
    const prefs = new Set(draft.stylePreferences);
    if (prefs.size === 0) return templateCatalog.slice(0, 3);

    return [...templateCatalog]
      .map((t) => ({
        template: t,
        score: t.styleTags.filter((tag) => prefs.has(tag)).length,
      }))
      .sort((a, b) => b.score - a.score)
      .filter((x) => x.score > 0)
      .slice(0, 3)
      .map((x) => x.template);
  }, [draft.stylePreferences]);

  const saveAndGoBuilder = async () => {
    try {
      setError('');
      setSaving(true);
      writeDraft(draft);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error('Please log in again before continuing.');
      }

      const { data, error: fnError } = await supabase.functions.invoke('setup-bootstrap', {
        body: draft,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (fnError) {
        const maybe = data as { error?: string; code?: string } | null;
        throw new Error(`${maybe?.error || fnError.message}${maybe?.code ? ` (${maybe.code})` : ''}`);
      }

      // draft has been committed server-side; keep selected template key but clear raw draft
      localStorage.removeItem('dayof.builderV2.setupDraft');
      navigate('/builder');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save setup.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold text-neutral-900">Website Setup</h1>
        <p className="mt-2 text-sm text-neutral-600">Builder V2 guided setup.</p>
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-neutral-500">
            <span>Setup progress</span>
            <span>{completion}%</span>
          </div>
          <div className="h-2 w-full rounded bg-neutral-200">
            <div className="h-2 rounded bg-rose-600 transition-all" style={{ width: `${completion}%` }} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-2">
          {steps.map((s) => {
            const isReviewLocked = s.key === 'review' && !canOpenReview;
            return (
              <Link
                key={s.key}
                to={isReviewLocked ? '#' : `/setup/${s.key}`}
                onClick={(e) => {
                  if (isReviewLocked) {
                    e.preventDefault();
                    setError('Complete names, date/location, and guest estimate before review.');
                  }
                }}
                className={`rounded border px-3 py-2 text-sm ${activeStep === s.key ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-neutral-300 bg-white text-neutral-700'} ${isReviewLocked ? 'opacity-60' : ''}`}
              >
                {s.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">Current step</p>
          <h2 className="text-xl font-semibold text-neutral-900 mt-1">{steps.find((s) => s.key === activeStep)?.label ?? 'Setup'}</h2>

          {activeStep === 'names' && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input className="w-full rounded border border-neutral-300 px-3 py-2 text-sm" placeholder="Partner 1 first name" value={draft.partnerOneFirstName} onChange={(e) => updateDraft({ partnerOneFirstName: e.target.value })} />
                <input className="w-full rounded border border-neutral-300 px-3 py-2 text-sm" placeholder="Partner 1 last name" value={draft.partnerOneLastName} onChange={(e) => updateDraft({ partnerOneLastName: e.target.value })} />
                <input className="w-full rounded border border-neutral-300 px-3 py-2 text-sm" placeholder="Partner 2 first name" value={draft.partnerTwoFirstName} onChange={(e) => updateDraft({ partnerTwoFirstName: e.target.value })} />
                <input className="w-full rounded border border-neutral-300 px-3 py-2 text-sm" placeholder="Partner 2 last name" value={draft.partnerTwoLastName} onChange={(e) => updateDraft({ partnerTwoLastName: e.target.value })} />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex items-center gap-2">
                <button type="button" onClick={continueFromNames} className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">Continue</button>
                <p className="text-xs text-neutral-500">Draft saves automatically in browser.</p>
              </div>
            </div>
          )}

          {activeStep === 'date' && (
            <div className="mt-4 space-y-4">
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input type="checkbox" checked={!draft.dateKnown} onChange={(e) => updateDraft({ dateKnown: !e.target.checked, weddingDate: e.target.checked ? '' : draft.weddingDate })} />
                We’re still deciding
              </label>

              <input type="date" disabled={!draft.dateKnown} className="w-full max-w-sm rounded border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100 disabled:text-neutral-500" value={draft.weddingDate} onChange={(e) => updateDraft({ weddingDate: e.target.value })} />

              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex items-center gap-2">
                <button type="button" onClick={goPrev} className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">Back</button>
                <button type="button" onClick={continueFromDate} className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">Continue</button>
              </div>
            </div>
          )}

          {activeStep === 'location' && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input className="w-full rounded border border-neutral-300 px-3 py-2 text-sm" placeholder="Wedding city" value={draft.weddingCity} onChange={(e) => updateDraft({ weddingCity: e.target.value })} />
                <input className="w-full rounded border border-neutral-300 px-3 py-2 text-sm" placeholder="State / Region (optional)" value={draft.weddingRegion} onChange={(e) => updateDraft({ weddingRegion: e.target.value })} />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex items-center gap-2">
                <button type="button" onClick={goPrev} className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">Back</button>
                <button type="button" onClick={continueFromLocation} className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">Continue</button>
              </div>
            </div>
          )}

          {activeStep === 'guest-estimate' && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  { value: 'lt50', label: 'Under 50 guests' },
                  { value: '50to100', label: '50–100 guests' },
                  { value: '100to200', label: '100–200 guests' },
                  { value: '200plus', label: '200+ guests' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateDraft({ guestEstimateBand: opt.value as SetupDraft['guestEstimateBand'] })}
                    className={`rounded border px-3 py-2 text-left text-sm ${draft.guestEstimateBand === opt.value ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-neutral-300 bg-white text-neutral-700'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex items-center gap-2">
                <button type="button" onClick={goPrev} className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">Back</button>
                <button type="button" onClick={continueFromGuestEstimate} className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">Continue</button>
              </div>
            </div>
          )}

          {activeStep === 'style' && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {styleOptions.map((style) => {
                  const selected = draft.stylePreferences.includes(style);
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => toggleStyle(style)}
                      className={`rounded border px-3 py-2 text-sm ${selected ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-neutral-300 bg-white text-neutral-700'}`}
                    >
                      {style}
                    </button>
                  );
                })}
              </div>

              <div>
                <p className="text-xs font-medium text-neutral-700 mb-2">Recommended templates</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {recommendedTemplates.map((tpl) => {
                    const active = draft.selectedTemplateId === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => updateDraft({ selectedTemplateId: tpl.id })}
                        className={`rounded border p-2 text-left ${active ? 'border-rose-500 bg-rose-50' : 'border-neutral-300 bg-white'}`}
                      >
                        <p className="text-sm font-medium text-neutral-900">{tpl.name}</p>
                        <p className="text-xs text-neutral-500">{tpl.colorwayId}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-xs text-neutral-500">Optional — helps preselect templates and starter sections.</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={goPrev} className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">Back</button>
                <button type="button" onClick={continueFromStyle} className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">Continue</button>
              </div>
            </div>
          )}

          {activeStep === 'review' && (
            <div className="mt-4 space-y-4">
              <div className="rounded border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700 space-y-1">
                <p><strong>Partners:</strong> {draft.partnerOneFirstName} {draft.partnerOneLastName} & {draft.partnerTwoFirstName} {draft.partnerTwoLastName}</p>
                <p><strong>Date:</strong> {draft.dateKnown ? (draft.weddingDate || 'Not set') : 'Still deciding'}</p>
                <p><strong>Location:</strong> {[draft.weddingCity, draft.weddingRegion].filter(Boolean).join(', ') || 'Not set'}</p>
                <p><strong>Guest estimate:</strong> {draft.guestEstimateBand || 'Not set'}</p>
                <p><strong>Styles:</strong> {draft.stylePreferences.join(', ') || 'None selected'}</p>
                <p><strong>Template:</strong> {selectedTemplateName}</p>
                <p><strong>Template ID:</strong> {draft.selectedTemplateId}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={goPrev} className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">Back</button>
                <button type="button" onClick={() => navigate('/templates')} className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">Change template</button>
                <button type="button" onClick={() => void saveAndGoBuilder()} disabled={saving} className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save and open builder'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupShell;
