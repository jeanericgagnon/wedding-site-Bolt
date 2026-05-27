import React from 'react';
import { Link } from 'react-router-dom';
import { buildGuestJourneyLinks, buildGuestJourneySteps, getGuestJourneyCopy, type GuestJourneyContext } from '../../lib/guestJourney';
import { getJourneyStatusLabel } from '../../lib/flowLabels';

type GuestJourneyCompanionProps = GuestJourneyContext & {
  className?: string;
};

export const GuestJourneyCompanion: React.FC<GuestJourneyCompanionProps> = ({
  className = '',
  ...context
}) => {
  const links = buildGuestJourneyLinks(context);
  if (links.length === 0) return null;

  const copy = getGuestJourneyCopy(context.currentSurface);
  const steps = buildGuestJourneySteps(context);

  const getStepTone = (status: (typeof steps)[number]['status']) => {
    switch (status) {
      case 'done':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'current':
        return 'border-primary/25 bg-primary/5 text-primary';
      case 'next':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case 'available':
      default:
        return 'border-border bg-white text-text-secondary';
    }
  };

  return (
    <section
      aria-label="Guest journey"
      className={`rounded-2xl border border-border-subtle bg-surface-subtle/50 p-4 sm:p-5 ${className}`.trim()}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Guest path</p>
        <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-medium text-primary">
          {copy.statusLabel}
        </span>
      </div>
      <h2 className="mt-2 text-lg font-semibold text-text-primary">{copy.title}</h2>
      <p className="mt-1.5 text-sm leading-6 text-text-secondary">{copy.detail}</p>
      <p className="mt-2 text-xs text-text-tertiary">{copy.nextStepLabel}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {copy.helperBadges.map((badge) => (
          <span key={badge} className="rounded-full border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-text-secondary">
            {badge}
          </span>
        ))}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Main focus</p>
          <p className="mt-1 text-sm font-semibold text-text-primary">{copy.focusTitle}</p>
          <p className="mt-1.5 text-sm leading-6 text-text-secondary">{copy.focusDetail}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Best next move</p>
          <p className="mt-1 text-sm font-semibold text-text-primary">{copy.bestNextMove}</p>
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Decision rule</p>
            <p className="mt-1 text-sm leading-6 text-text-secondary">{copy.decisionRule}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step) => (
          <div key={step.key} className={`rounded-xl border px-3 py-2.5 ${getStepTone(step.status)}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-current">{step.label}</p>
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-current/80">{getJourneyStatusLabel(step.status)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.key}
            to={link.href}
            className="inline-flex min-h-[40px] items-center rounded-full border border-border bg-white px-3.5 py-2 text-sm font-medium text-text-primary transition hover:border-primary/40 hover:text-primary"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
};
