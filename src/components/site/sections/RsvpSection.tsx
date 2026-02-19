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
      window.location.href = `/rsvp/${weddingSiteId}`;
    }
  };

  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-accent/10 rounded-full mb-6">
          <Heart className="w-7 h-7 text-accent" fill="currentColor" />
        </div>

        <h2 className="text-4xl md:text-5xl font-light text-text-primary mb-4">
          RSVP
        </h2>

        {content.deadline_text && (
          <p className="text-lg text-accent font-medium mb-4">
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
          <div className="mb-8 bg-surface border border-border rounded-xl p-6 inline-block text-left">
            <h3 className="font-semibold text-text-primary mb-3 text-center">Meal Options</h3>
            <ul className="text-text-secondary space-y-1">
              {content.meal_options.map((option, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full flex-shrink-0" />
                  {option}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={handleRsvpClick}
          className="inline-flex items-center justify-center gap-2 px-10 py-4 text-lg font-semibold text-white bg-accent hover:bg-accent-hover rounded-full transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
        >
          RSVP Now
        </button>

        {!weddingSiteId && (
          <p className="mt-4 text-sm text-text-tertiary">RSVP form link coming soon</p>
        )}
      </div>
    </section>
  );
};
