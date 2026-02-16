import React from 'react';
import { Mail } from 'lucide-react';
import { Button } from '../../ui';
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
    <section className="py-16 px-8 bg-background">
      <div className="max-w-4xl mx-auto text-center">
        <Mail className="w-12 h-12 text-accent mx-auto mb-6" />
        <h2 className="text-4xl font-bold text-text-primary mb-6">
          RSVP
        </h2>

        {content.deadline_text && (
          <p className="text-lg text-text-secondary mb-4">
            {content.deadline_text}
          </p>
        )}

        {content.message && (
          <p className="text-text-secondary mb-8">
            {content.message}
          </p>
        )}

        {content.meal_options && content.meal_options.length > 0 && (
          <div className="mb-8 bg-surface rounded-lg p-6 inline-block">
            <h3 className="font-semibold text-text-primary mb-3">Meal Options</h3>
            <ul className="text-text-secondary space-y-1">
              {content.meal_options.map((option, index) => (
                <li key={index}>{option}</li>
              ))}
            </ul>
          </div>
        )}

        <Button
          variant="accent"
          size="lg"
          onClick={handleRsvpClick}
        >
          Submit Your RSVP
        </Button>
      </div>
    </section>
  );
};
