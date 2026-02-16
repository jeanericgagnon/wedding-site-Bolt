import React from 'react';
import { MapPin, Clock, Shirt } from 'lucide-react';
import type { DetailsContent } from '../../../types/siteConfig';

interface DetailsSectionProps {
  content: DetailsContent;
}

export const DetailsSection: React.FC<DetailsSectionProps> = ({ content }) => {
  return (
    <section className="py-16 px-8 bg-surface">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-text-primary text-center mb-12">
          Wedding Details
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-background rounded-lg p-6">
            <div className="flex items-start gap-4">
              <MapPin className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-text-primary mb-2">Location</h3>
                <p className="text-text-secondary">{content.venue_name}</p>
                <p className="text-text-secondary text-sm mt-1">{content.venue_address}</p>
              </div>
            </div>
          </div>

          <div className="bg-background rounded-lg p-6">
            <div className="flex items-start gap-4">
              <Clock className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-text-primary mb-2">Time</h3>
                <p className="text-text-secondary">Ceremony: {content.ceremony_time}</p>
                <p className="text-text-secondary mt-1">Reception: {content.reception_time}</p>
              </div>
            </div>
          </div>

          {content.attire && (
            <div className="bg-background rounded-lg p-6">
              <div className="flex items-start gap-4">
                <Shirt className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-text-primary mb-2">Attire</h3>
                  <p className="text-text-secondary">{content.attire}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {content.notes && (
          <div className="mt-8 bg-primary/5 rounded-lg p-6">
            <h3 className="font-semibold text-text-primary mb-3">Our Story</h3>
            <p className="text-text-secondary whitespace-pre-line">{content.notes}</p>
          </div>
        )}
      </div>
    </section>
  );
};
