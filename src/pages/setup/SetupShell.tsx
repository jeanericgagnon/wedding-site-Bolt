import React from 'react';
import { Link, useParams } from 'react-router-dom';

const steps = [
  { key: 'names', label: 'Couple names' },
  { key: 'date', label: 'Wedding date' },
  { key: 'location', label: 'Location' },
  { key: 'guest-estimate', label: 'Guest estimate' },
  { key: 'style', label: 'Style preferences' },
  { key: 'review', label: 'Review & generate' },
];

export const SetupShell: React.FC<{ step?: string }> = ({ step }) => {
  const params = useParams();
  const activeStep = step ?? params.step ?? 'names';

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold text-neutral-900">Website Setup</h1>
        <p className="mt-2 text-sm text-neutral-600">Builder V2 canonical setup route skeleton.</p>

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
          <p className="mt-2 text-sm text-neutral-600">Placeholder skeleton step. This route is now reserved for Builder V2 funnel implementation.</p>
        </div>
      </div>
    </div>
  );
};

export default SetupShell;
