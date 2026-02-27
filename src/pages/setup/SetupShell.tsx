import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

const steps = [
  { key: 'names', label: 'Couple names' },
  { key: 'date', label: 'Wedding date' },
  { key: 'location', label: 'Location' },
  { key: 'guest-estimate', label: 'Guest estimate' },
  { key: 'style', label: 'Style preferences' },
  { key: 'review', label: 'Review & generate' },
] as const;

type SetupDraft = {
  partnerOneFirstName: string;
  partnerOneLastName: string;
  partnerTwoFirstName: string;
  partnerTwoLastName: string;
};

const DRAFT_KEY = 'dayof.builderV2.setupDraft';

const readDraft = (): SetupDraft => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) {
      return {
        partnerOneFirstName: '',
        partnerOneLastName: '',
        partnerTwoFirstName: '',
        partnerTwoLastName: '',
      };
    }
    const parsed = JSON.parse(raw) as Partial<SetupDraft>;
    return {
      partnerOneFirstName: parsed.partnerOneFirstName ?? '',
      partnerOneLastName: parsed.partnerOneLastName ?? '',
      partnerTwoFirstName: parsed.partnerTwoFirstName ?? '',
      partnerTwoLastName: parsed.partnerTwoLastName ?? '',
    };
  } catch {
    return {
      partnerOneFirstName: '',
      partnerOneLastName: '',
      partnerTwoFirstName: '',
      partnerTwoLastName: '',
    };
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

  const nextStep = useMemo(() => {
    const idx = steps.findIndex((s) => s.key === activeStep);
    if (idx < 0 || idx >= steps.length - 1) return null;
    return steps[idx + 1].key;
  }, [activeStep]);

  const updateDraft = (patch: Partial<SetupDraft>) => {
    setError('');
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      writeDraft(next);
      return next;
    });
  };

  const continueFromNames = () => {
    if (!draft.partnerOneFirstName.trim() || !draft.partnerTwoFirstName.trim()) {
      setError('Please enter first names for both partners.');
      return;
    }
    if (nextStep) navigate(`/setup/${nextStep}`);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold text-neutral-900">Website Setup</h1>
        <p className="mt-2 text-sm text-neutral-600">Builder V2 guided setup.</p>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-2">
          {steps.map((s) => (
            <Link
              key={s.key}
              to={`/setup/${s.key}`}
              className={`rounded border px-3 py-2 text-sm ${activeStep === s.key ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-neutral-300 bg-white text-neutral-700'}`}
            >
              {s.label}
            </Link>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">Current step</p>
          <h2 className="text-xl font-semibold text-neutral-900 mt-1">{steps.find((s) => s.key === activeStep)?.label ?? 'Setup'}</h2>

          {activeStep === 'names' ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                  placeholder="Partner 1 first name"
                  value={draft.partnerOneFirstName}
                  onChange={(e) => updateDraft({ partnerOneFirstName: e.target.value })}
                />
                <input
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                  placeholder="Partner 1 last name"
                  value={draft.partnerOneLastName}
                  onChange={(e) => updateDraft({ partnerOneLastName: e.target.value })}
                />
                <input
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                  placeholder="Partner 2 first name"
                  value={draft.partnerTwoFirstName}
                  onChange={(e) => updateDraft({ partnerTwoFirstName: e.target.value })}
                />
                <input
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                  placeholder="Partner 2 last name"
                  value={draft.partnerTwoLastName}
                  onChange={(e) => updateDraft({ partnerTwoLastName: e.target.value })}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={continueFromNames}
                  className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
                >
                  Continue
                </button>
                <p className="text-xs text-neutral-500">Draft saves automatically in browser.</p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-neutral-600">Step scaffold placeholder. Implementation follows in next issues.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupShell;
