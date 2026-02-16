import React from 'react';
import { Hotel, Car } from 'lucide-react';
import type { TravelContent } from '../../../types/siteConfig';

interface TravelSectionProps {
  content: TravelContent;
}

export const TravelSection: React.FC<TravelSectionProps> = ({ content }) => {
  return (
    <section className="py-16 px-8 bg-surface">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-text-primary text-center mb-12">
          Travel & Accommodations
        </h2>

        {content.hotels && content.hotels.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Hotel className="w-6 h-6 text-primary" />
              <h3 className="text-2xl font-semibold text-text-primary">Hotels</h3>
            </div>
            <div className="space-y-4">
              {content.hotels.map((hotel, index) => (
                <div key={index} className="bg-background rounded-lg p-6">
                  <h4 className="font-semibold text-text-primary mb-2">{hotel.name}</h4>
                  {hotel.address && (
                    <p className="text-text-secondary text-sm mb-1">{hotel.address}</p>
                  )}
                  {hotel.phone && (
                    <p className="text-text-secondary text-sm mb-1">{hotel.phone}</p>
                  )}
                  {hotel.url && (
                    <a
                      href={hotel.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline"
                    >
                      Visit Website
                    </a>
                  )}
                  {hotel.notes && (
                    <p className="text-text-secondary text-sm mt-2 italic">{hotel.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {content.parking && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Car className="w-6 h-6 text-primary" />
              <h3 className="text-2xl font-semibold text-text-primary">Parking</h3>
            </div>
            <div className="bg-background rounded-lg p-6">
              <p className="text-text-secondary">{content.parking}</p>
            </div>
          </div>
        )}

        {content.transportation && (
          <div className="bg-background rounded-lg p-6">
            <h3 className="text-xl font-semibold text-text-primary mb-3">Transportation</h3>
            <p className="text-text-secondary">{content.transportation}</p>
          </div>
        )}
      </div>
    </section>
  );
};
