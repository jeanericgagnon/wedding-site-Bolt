import React from 'react';
import { Link } from 'react-router-dom';
import { buildGuestJourneyLinks, getGuestJourneyCopy, type GuestJourneyContext } from '../../lib/guestJourney';

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

  return (
    <section
      aria-label="Guest journey"
      className={`rounded-2xl border border-border-subtle bg-surface-subtle/50 p-4 sm:p-5 ${className}`.trim()}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Guest path</p>
      <h2 className="mt-2 text-lg font-semibold text-text-primary">{copy.title}</h2>
      <p className="mt-1.5 text-sm leading-6 text-text-secondary">{copy.detail}</p>
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
