import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { invokeFunctionOrThrow } from '../../lib/invokeFunctionOrThrow';
import { templateCatalog } from '../../builder/constants/templateCatalog';
import { TEMPLATE_USE_CASE_PACKS } from '../../builder/constants/templateUseCasePacks';
import { clearSetupDraft, clearSetupDraftOnly, readSetupDraft, setupDraftProgress, type SetupDraft, writeSetupDraft } from '../../lib/setupDraft';

const steps = [
  { key: 'names', label: 'Couple names' },
  { key: 'date', label: 'Wedding date' },
  { key: 'location', label: 'Location' },
  { key: 'guest-estimate', label: 'Guest estimate' },
  { key: 'style', label: 'Style preferences' },
  { key: 'review', label: 'Review & continue' },
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
  'Weekend',
] as const;

export const SetupShell: React.FC<{ step?: string }> = ({ step }) => {
  const params = useParams();
  const navigate = useNavigate();
  const activeStep = step ?? params.step ?? 'names';

  const [draft, setDraft] = useState<SetupDraft>(() => readSetupDraft());
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const completion = useMemo(() => setupDraftProgress(draft), [draft]);

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
      writeSetupDraft(next);
      return next;
    });
  };

  const firstIncompleteStep = useMemo(() => {
    if (!draft.partnerOneFirstName.trim() || !draft.partnerTwoFirstName.trim()) return 'names';
    if (draft.dateKnown && !draft.weddingDate) return 'date';
    if (!draft.weddingCity.trim()) return 'location';
    if (!draft.guestEstimateBand) return 'guest-estimate';
    return 'style';
  }, [draft]);

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


  const setupMode = useMemo(() => {
    const prefs = new Set(draft.stylePreferences);
    const destination = prefs.has('Destination');
    const bilingual = prefs.has('Bilingual');
    const interfaith = prefs.has('Interfaith');
    const weekend = prefs.has('Weekend') || destination || draft.guestEstimateBand === '200plus';
    return { destination, bilingual, interfaith, weekend };
  }, [draft.stylePreferences, draft.guestEstimateBand]);

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

  const resetSetupDraft = () => {
    clearSetupDraft();
    window.location.href = '/setup/names';
  };

  const saveAndGoBuilder = async () => {
    try {
      setError('');
      setSaving(true);
      writeSetupDraft(draft);

      await invokeFunctionOrThrow(supabase, 'setup-bootstrap', draft as unknown as Record<string, unknown>);

      // draft has been committed server-side; keep selected template key but clear raw draft
      clearSetupDraftOnly();
      navigate('/builder');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your setup right now.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold text-neutral-900">Set up your wedding website</h1>
        <p className="mt-2 text-sm text-neutral-600">A quick guided setup to get your site ready faster.</p>
        <p className="mt-1 text-xs text-neutral-500">Useful whether you're starting fresh or moving over from Zola, Joy, or The Knot.</p>
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-neutral-500">
            <span>Setup progress</span>
            <span>{completion}%</span>
          </div>
          <div className="h-2 w-full rounded bg-neutral-200">
            <div className="h-2 rounded bg-rose-600 transition-all" style={{ width: `${completion}%` }} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/setup/${firstIncompleteStep}`)}
            className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100"
          >
            Continue where you left off
          </button>
          <button
            type="button"
            onClick={() => navigate('/templates')}
            className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100"
          >
            Browse templates
          </button>
          <span className="text-xs text-neutral-500">Bring over the basics now. Refine everything else after setup.</span>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
          {steps.map((s) => {
            const isReviewLocked = s.key === 'review' && !canOpenReview;
            return (
              <Link
                key={s.key}
                to={isReviewLocked ? '#' : `/setup/${s.key}`}
                onClick={(e) => {
                  if (isReviewLocked) {
                    e.preventDefault();
                    setError('Add names, date or timing, location, and guest estimate before review.');
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
                <p className="text-xs text-neutral-500">Your progress saves automatically in this browser.</p>
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
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
                If this is a destination or multi-day weekend, start with the city first. You can fill in hotels, parking, airport notes, and the rest of the weekend flow right after setup.
              </div>
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
                <p className="text-xs font-medium text-neutral-700 mb-2">Recommended starting points</p>
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

              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
                <p className="font-medium text-neutral-800">Setup direction</p>
                <p className="mt-1">{setupMode.destination ? 'Destination wedding mode is on — DayOf should lean harder into travel, hotel, and arrival guidance.' : setupMode.weekend ? 'Weekend-style setup is on — DayOf should expect more than one event and more guest coordination.' : 'Classic single-day setup is fine here. You can still add extra events later.'}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {TEMPLATE_USE_CASE_PACKS.map((pack) => {
                  const active = (pack.id === 'destination' && setupMode.destination) || (pack.id === 'bilingual' && setupMode.bilingual) || (pack.id === 'interfaith' && setupMode.interfaith);
                  return (
                    <div key={pack.id} className={`rounded-lg border p-3 text-xs ${active ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-neutral-200 bg-white text-neutral-600'}`}>
                      <p className="font-medium text-neutral-900">{pack.label}</p>
                      <p className="mt-1">{pack.description}</p>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-neutral-500">Optional — helps Dayof pick a better starting direction for your site.</p>
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
                <p><strong>Setup direction:</strong> {setupMode.destination ? 'Destination wedding' : setupMode.weekend ? 'Multi-day / weekend wedding' : 'Single-day wedding'}</p>
                <p><strong>Use-case packs:</strong> {[setupMode.destination && 'Destination', setupMode.bilingual && 'Bilingual', setupMode.interfaith && 'Interfaith'].filter(Boolean).join(', ') || 'None selected yet'}</p>
                <p><strong>Template:</strong> {selectedTemplateName}</p>
                <p><strong>Template ID:</strong> {draft.selectedTemplateId}</p>
              </div>

              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
                {setupMode.destination ? 'Next after setup: confirm travel details, hotel guidance, and weekend events before publishing.' : setupMode.weekend ? 'Next after setup: add your full weekend schedule so guests can follow the flow clearly.' : 'Next after setup: finish the main event details, RSVP settings, and guest list.'} {setupMode.bilingual ? 'Keep bilingual guest copy in mind while you fill out FAQs and key guest guidance.' : ''} {setupMode.interfaith ? 'Add a short ceremony note early so guests understand the traditions being honored.' : ''}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={goPrev} className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">Back</button>
                <button type="button" onClick={() => navigate('/templates')} className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">Choose a different template</button>
                <button type="button" onClick={resetSetupDraft} className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">Start over</button>
                <button type="button" onClick={() => void saveAndGoBuilder()} disabled={saving} className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save and open your site editor'}
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
