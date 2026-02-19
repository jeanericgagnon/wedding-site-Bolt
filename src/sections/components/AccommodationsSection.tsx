import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { Hotel, ExternalLink, Phone, Tag } from 'lucide-react';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

interface HotelBlock {
  name: string;
  address?: string;
  phone?: string;
  url?: string;
  blockCode?: string;
  blockDeadline?: string;
  priceRange?: string;
  distance?: string;
  notes?: string;
}

function getHotels(settings: SectionInstance['settings']): HotelBlock[] {
  if (settings.hotels && Array.isArray(settings.hotels)) {
    return settings.hotels as HotelBlock[];
  }
  return [];
}

export const AccommodationsSection: React.FC<Props> = ({ data, instance }) => {
  const { settings } = instance;
  const hotels = getHotels(settings);
  const generalNote = (settings.generalNote as string) || data.travel?.hotelInfo || '';

  return (
    <section className="py-20 px-4 bg-surface-subtle">
      <div className="max-w-4xl mx-auto">
        {settings.showTitle !== false && (
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3 font-medium">
              {settings.eyebrow as string || 'Where to stay'}
            </p>
            <h2 className="text-4xl font-light text-text-primary">
              {settings.title as string || 'Accommodations'}
            </h2>
            {generalNote && (
              <p className="mt-4 text-text-secondary max-w-xl mx-auto">{generalNote}</p>
            )}
            <div className="w-10 h-px bg-primary mx-auto mt-6" />
          </div>
        )}

        {hotels.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-text-tertiary">
            <Hotel className="w-8 h-8" />
            <p className="text-sm">Add hotel blocks in section settings</p>
            {generalNote && !settings.showTitle && (
              <p className="text-text-secondary text-sm max-w-md text-center mt-2">{generalNote}</p>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {hotels.map((hotel, i) => (
              <div key={i} className="bg-surface border border-border rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Hotel className="w-4 h-4 text-primary flex-shrink-0" />
                      <h3 className="font-semibold text-text-primary">{hotel.name}</h3>
                    </div>
                    {hotel.address && (
                      <p className="text-sm text-text-secondary ml-6 mb-2">{hotel.address}</p>
                    )}
                    {hotel.distance && (
                      <p className="text-xs text-text-tertiary ml-6">{hotel.distance} from venue</p>
                    )}
                    {hotel.notes && (
                      <p className="text-sm text-text-secondary ml-6 mt-2 italic">{hotel.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end flex-shrink-0">
                    {hotel.priceRange && (
                      <span className="inline-flex items-center gap-1 text-xs bg-surface-subtle border border-border px-2.5 py-1 rounded-full text-text-secondary">
                        {hotel.priceRange}
                      </span>
                    )}
                    {hotel.blockCode && (
                      <div className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                        <Tag className="w-3 h-3" />
                        Code: {hotel.blockCode}
                      </div>
                    )}
                    {hotel.blockDeadline && (
                      <p className="text-xs text-text-tertiary">Book by {hotel.blockDeadline}</p>
                    )}
                  </div>
                </div>
                {(hotel.url || hotel.phone) && (
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                    {hotel.phone && (
                      <a href={`tel:${hotel.phone}`} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors">
                        <Phone className="w-3.5 h-3.5" />
                        {hotel.phone}
                      </a>
                    )}
                    {hotel.url && (
                      <a
                        href={hotel.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Book now
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export const AccommodationsCards: React.FC<Props> = ({ data, instance }) => {
  const { settings } = instance;
  const hotels = getHotels(settings);
  const generalNote = (settings.generalNote as string) || data.travel?.hotelInfo || '';

  return (
    <section className="py-20 px-4 bg-surface">
      <div className="max-w-5xl mx-auto">
        {settings.showTitle !== false && (
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3 font-medium">
              {settings.eyebrow as string || 'Where to stay'}
            </p>
            <h2 className="text-4xl font-light text-text-primary">
              {settings.title as string || 'Accommodations'}
            </h2>
            {generalNote && (
              <p className="mt-4 text-text-secondary max-w-xl mx-auto">{generalNote}</p>
            )}
            <div className="w-10 h-px bg-primary mx-auto mt-6" />
          </div>
        )}

        {hotels.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-text-tertiary">
            <Hotel className="w-8 h-8" />
            <p className="text-sm">Add hotel blocks in section settings</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {hotels.map((hotel, i) => (
              <div key={i} className="rounded-2xl border border-border bg-surface-subtle p-7 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-text-primary text-lg">{hotel.name}</h3>
                    {hotel.address && (
                      <p className="text-sm text-text-secondary mt-0.5">{hotel.address}</p>
                    )}
                    {hotel.distance && (
                      <p className="text-xs text-text-tertiary mt-0.5">{hotel.distance} from venue</p>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Hotel className="w-5 h-5 text-primary" />
                  </div>
                </div>
                {(hotel.blockCode || hotel.priceRange) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {hotel.priceRange && (
                      <span className="text-xs border border-border px-2.5 py-1 rounded-full text-text-secondary bg-surface">
                        {hotel.priceRange}
                      </span>
                    )}
                    {hotel.blockCode && (
                      <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        Code: {hotel.blockCode}
                      </span>
                    )}
                    {hotel.blockDeadline && (
                      <span className="text-xs text-text-tertiary">Book by {hotel.blockDeadline}</span>
                    )}
                  </div>
                )}
                {hotel.notes && <p className="text-sm text-text-secondary italic">{hotel.notes}</p>}
                {hotel.url && (
                  <a
                    href={hotel.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Book this hotel
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
