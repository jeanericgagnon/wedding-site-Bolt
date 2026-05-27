import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { invokeFunctionOrThrow } from '../../lib/invokeFunctionOrThrow';
import { templateCatalog } from '../../builder/constants/templateCatalog';
import { TEMPLATE_USE_CASE_PACKS } from '../../builder/constants/templateUseCasePacks';
import { clearSetupDraft, clearSetupDraftOnly, readSetupDraft, setupDraftProgress, type SetupDraft, writeSetupDraft } from '../../lib/setupDraft';
import { deriveSetupMode, getRecommendedTemplates, SETUP_STYLE_OPTIONS } from '../../lib/setupDraftRecommendations';
import { buildSetupReviewModel, buildSetupTemplateReason } from '../../lib/setupConcierge';

const steps = [
  { key: 'migration', label: 'Migration' },
  { key: 'names', label: 'Couple names' },
  { key: 'date', label: 'Wedding date' },
  { key: 'location', label: 'Location' },
  { key: 'guest-estimate', label: 'Guest estimate' },
  { key: 'style', label: 'Style preferences' },
  { key: 'review', label: 'Review & continue' },
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
    if (draft.migrationSource === '') return 'migration';
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

  const continueFromMigration = () => {
    if (!draft.migrationSource) {
      setError('Please choose whether you are starting fresh or moving over from another platform.');
      return;
    }
    goNext();
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
  const selectedTemplate = useMemo(() => {
    return templateCatalog.find((t) => t.id === draft.selectedTemplateId) ?? null;
  }, [draft.selectedTemplateId]);


  const setupMode = useMemo(() => deriveSetupMode(draft), [draft]);

  const recommendedTemplates = useMemo(() => getRecommendedTemplates(draft, templateCatalog), [draft]);
  const reviewModel = useMemo(() => buildSetupReviewModel(draft, selectedTemplate), [draft, selectedTemplate]);

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
        {draft.migrationSource && <p className="mt-1 text-xs text-rose-700">Current path: {draft.migrationSource === 'other' ? 'migration from another source' : `migration from ${draft.migrationSource}`}</p>}
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

          {activeStep === 'migration' && (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
              Starting fresh is fine. Moving over from Zola, Joy, The Knot, or somewhere else is fine too. We just want to shape the next steps the right way.
            </div>
            {draft.migrationSource && draft.migrationSource !== 'other' && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                Migration-first guidance: start by securing your names, date, city, and guest structure here. You can clean up story, FAQs, registry links, and design once the core move is done.
              </div>
            )}
            {draft.migrationSource === 'other' && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                Migration-first guidance: move the essentials first — names, date, location, guest list, and RSVP setup — then fill in the rest after the switch is stable.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              {[
                ['other', 'Starting fresh'],
                ['zola', 'From Zola'],
                ['joy', 'From Joy'],
                ['the-knot', 'From The Knot'],
                ['other', 'From somewhere else'],
              ].map(([value, label], idx) => (
                <button
                  key={`${value}-${idx}`}
                  type="button"
                  onClick={() => updateDraft({ migrationSource: value as SetupDraft['migrationSource'] })}
                  className={`rounded-xl border px-4 py-3 text-sm text-left ${draft.migrationSource === value && !(label === 'Starting fresh' && draft.migrationSource === 'other') ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-3 text-xs text-neutral-600">
              Next, we will lock in the essentials that make the move feel stable: your names, your date, and the city guests need to orient around. Design cleanup can wait until after that.
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-neutral-500">We will use this to shape migration-specific guidance next.</div>
              <button onClick={continueFromMigration} className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm hover:bg-neutral-800">Continue</button>
            </div>
          </div>
        )}

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
              {draft.migrationSource && <div className="rounded-lg border border-neutral-200 bg-white p-3 text-xs text-neutral-600">If you're migrating, this is the point where the switch starts feeling real. Get the core location right now; details can follow.</div>}
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
                {SETUP_STYLE_OPTIONS.map((style) => {
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
                        <p className="mt-1 text-xs text-neutral-600">{buildSetupTemplateReason(tpl, draft)}</p>
                        <p className="mt-2 text-[11px] text-neutral-500">{tpl.colorwayId} · {tpl.defaultSectionOrder.slice(0, 3).join(' · ')}</p>
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
              <p className="text-xs text-neutral-500">Optional — helps Dayof pick a better starting direction for your site. Destination is currently the deepest of these packs; bilingual and interfaith are still earlier.</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={goPrev} className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">Back</button>
                <button type="button" onClick={continueFromStyle} className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">Continue</button>
              </div>
            </div>
          )}

          {activeStep === 'review' && (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-rose-900">{reviewModel.heading}</p>
                  <span className="rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-medium text-rose-700">
                    {reviewModel.confidenceLabel}
                  </span>
                </div>
                <p className="mt-1 text-sm text-rose-800">{reviewModel.summary}</p>
                <p className="mt-2 text-xs text-rose-700">{reviewModel.nextBestMove}</p>
                {reviewModel.watchouts.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {reviewModel.watchouts.map((watchout) => (
                      <p key={watchout} className="text-xs text-rose-700">{watchout}</p>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700 space-y-1">
                <p><strong>Partners:</strong> {draft.partnerOneFirstName} {draft.partnerOneLastName} & {draft.partnerTwoFirstName} {draft.partnerTwoLastName}</p>
                <p><strong>Date:</strong> {draft.dateKnown ? (draft.weddingDate || 'Not set') : 'Still deciding'}</p>
                <p><strong>Location:</strong> {[draft.weddingCity, draft.weddingRegion].filter(Boolean).join(', ') || 'Not set'}</p>
                <p><strong>Guest estimate:</strong> {draft.guestEstimateBand || 'Not set'}</p>
                <p><strong>Migration source:</strong> {draft.migrationSource ? (draft.migrationSource === 'the-knot' ? 'The Knot' : draft.migrationSource === 'joy' ? 'Joy' : draft.migrationSource === 'zola' ? 'Zola' : 'Other / starting fresh') : 'Not selected'}</p>
                <p><strong>Styles:</strong> {draft.stylePreferences.join(', ') || 'None selected'}</p>
                <p><strong>Setup direction:</strong> {setupMode.destination ? 'Destination wedding' : setupMode.weekend ? 'Multi-day / weekend wedding' : 'Single-day wedding'}</p>
                <p><strong>Use-case packs:</strong> {[setupMode.destination && 'Destination', setupMode.bilingual && 'Bilingual', setupMode.interfaith && 'Interfaith'].filter(Boolean).join(', ') || 'None selected yet'}</p>
                <p><strong>Template:</strong> {selectedTemplateName}</p>
                <p><strong>Template ID:</strong> {draft.selectedTemplateId}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-neutral-200 bg-white p-4">
                  <p className="text-sm font-semibold text-neutral-900">DayOf will start with</p>
                  <div className="mt-3 space-y-3">
                    {reviewModel.starterChecklist.map((item) => (
                      <div key={item.id} className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
                        <p className="text-sm font-medium text-neutral-900">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-neutral-600">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-white p-4">
                  <p className="text-sm font-semibold text-neutral-900">Finish these first in the builder</p>
                  <div className="mt-3 space-y-3">
                    {reviewModel.builderChecklist.map((item) => (
                      <div key={item.id} className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
                        <p className="text-sm font-medium text-neutral-900">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-neutral-600">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
                {setupMode.destination ? 'Next after setup: confirm travel details, hotel guidance, and weekend events before deciding the site is ready to publish.' : setupMode.weekend ? 'Next after setup: add your full weekend schedule so guests can follow the flow clearly.' : 'Next after setup: finish the main event details, RSVP settings, and guest list before you treat the site as launch-ready.'} {setupMode.bilingual ? 'Keep bilingual guest copy in mind while you fill out FAQs and key guest guidance.' : ''} {setupMode.interfaith ? 'Add a short ceremony note early so guests understand the traditions being honored.' : ''}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={goPrev} className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">Back</button>
                <button type="button" onClick={() => navigate('/templates')} className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">Choose a different template</button>
                <button type="button" onClick={resetSetupDraft} className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">Start over</button>
                <button type="button" onClick={() => void saveAndGoBuilder()} disabled={saving} className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save and build my first draft'}
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
