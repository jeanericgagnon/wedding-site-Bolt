import React from 'react';
import { Heart } from 'lucide-react';
import type { RsvpContent } from '../../../types/siteConfig';

interface RsvpSectionProps {
  content: RsvpContent;
  weddingSiteId?: string;
}

export const RsvpSection: React.FC<RsvpSectionProps> = ({ content, weddingSiteId }) => {
  const handleRsvpClick = () => {
    if (weddingSiteId) {
      window.location.href = '/rsvp';
    }
  };

  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-lg border border-border-subtle bg-surface-subtle">
          <Heart className="h-6 w-6 text-primary" fill="currentColor" />
        </div>

        <h2 className="text-4xl md:text-5xl font-light text-text-primary mb-4">
          RSVP
        </h2>

        {content.deadline_text && (
          <p className="text-lg text-primary font-medium mb-4">
            {content.deadline_text}
          </p>
        )}

        {content.message && (
          <p className="text-lg text-text-secondary mb-10 leading-relaxed">
            {content.message}
          </p>
        )}

        {!content.message && (
          <p className="text-lg text-text-secondary mb-10 leading-relaxed">
            We'd love to celebrate with you. Please let us know if you can make it.
          </p>
        )}

        {content.meal_options && content.meal_options.length > 0 && (
          <div className="mb-8 bg-surface border border-border rounded-lg p-6 inline-block text-left">
            <h3 className="font-semibold text-text-primary mb-3 text-center">Meal Options</h3>
            <ul className="text-text-secondary space-y-1">
              {content.meal_options.map((option, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-sm bg-primary" />
                  {option}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-6 rounded-lg border border-border bg-surface-subtle/30 px-4 py-3 text-left text-sm text-text-secondary">
          <p className="font-medium text-text-primary">What happens next</p>
          <p className="mt-1">Once you reply, the couple can use your RSVP details for planning, seating, and day-of updates. You can come back later if they need anything else from you.</p>
          <p className="mt-2 text-text-tertiary">Travel details, schedule updates, and day-of notes may be refined closer to the celebration, so this page is worth checking again.</p>
        </div>

        <button
          onClick={handleRsvpClick}
          disabled={!weddingSiteId}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-8 py-3 text-base font-semibold transition-colors ${
            weddingSiteId
              ? 'bg-primary text-white hover:bg-primary-hover'
              : 'cursor-not-allowed border border-border-subtle bg-surface-subtle text-text-tertiary'
          }`}
        >
          {weddingSiteId ? 'Send RSVP' : 'RSVP opening soon'}
        </button>

        {!weddingSiteId && (
          <p className="mt-4 text-sm text-text-tertiary">Reply details will be added here soon.</p>
        )}
      </div>
    </section>
  );
};
