import React from 'react';
import { z } from 'zod';
import { MapPin, Phone, ExternalLink, Star } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const AccommodationSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  stars: z.number().min(0).max(5).default(4),
  distance: z.string().default(''),
  priceRange: z.string().default(''),
  bookingCode: z.string().default(''),
  phone: z.string().default(''),
  url: z.string().default(''),
  image: z.string().default(''),
  notes: z.string().default(''),
  recommended: z.boolean().default(false),
});

export const accommodationsCardsSchema = z.object({
  eyebrow: z.string().default('Where to stay'),
  headline: z.string().default('Accommodations'),
  generalNote: z.string().default(''),
  blockNote: z.string().default(''),
  hotels: z.array(AccommodationSchema).default([]),
});

export type AccommodationsCardsData = z.infer<typeof accommodationsCardsSchema>;

export const defaultAccommodationsCardsData: AccommodationsCardsData = {
  eyebrow: 'Where to stay',
  headline: 'Accommodations',
  generalNote: 'We\'ve secured room blocks at the hotels below. Mention our wedding when booking to receive the discounted rate.',
  blockNote: 'Room blocks expire May 1st, 2025. Book early to secure your rate.',
  hotels: [
    {
      id: '1',
      name: 'The Lowell Hotel',
      stars: 5,
      distance: '0.4 miles from venue',
      priceRange: '$289 – $450 / night',
      bookingCode: 'SMITH2025',
      phone: '+1 (212) 838-1400',
      url: '',
      image: 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800',
      notes: 'Complimentary breakfast included with room block rate.',
      recommended: true,
    },
    {
      id: '2',
      name: 'Baccarat Hotel & Residences',
      stars: 5,
      distance: '0.2 miles from venue',
      priceRange: '$395 – $600 / night',
      bookingCode: '',
      phone: '+1 (212) 790-8800',
      url: '',
      image: 'https://images.pexels.com/photos/2869215/pexels-photo-2869215.jpeg?auto=compress&cs=tinysrgb&w=800',
      notes: '',
      recommended: false,
    },
    {
      id: '3',
      name: 'The Benjamin Royal Sonesta',
      stars: 4,
      distance: '0.6 miles from venue',
      priceRange: '$189 – $299 / night',
      bookingCode: 'WEDDING25',
      phone: '+1 (212) 715-2500',
      url: '',
      image: 'https://images.pexels.com/photos/1010657/pexels-photo-1010657.jpeg?auto=compress&cs=tinysrgb&w=800',
      notes: 'Pet-friendly. Free cancellation within 48 hours.',
      recommended: false,
    },
  ],
};

const AccommodationsCards: React.FC<SectionComponentProps<AccommodationsCardsData>> = ({ data }) => {
  return (
    <section className="py-24 md:py-32 bg-white" id="accommodations">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="text-center mb-14">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">
              {data.eyebrow}
            </p>
          )}
          <h2 className="text-4xl md:text-5xl font-light text-stone-900 mb-4">{data.headline}</h2>
          {data.generalNote && (
            <p className="text-stone-500 font-light max-w-2xl mx-auto">{data.generalNote}</p>
          )}
        </div>

        {data.blockNote && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-xl text-center">
            <p className="text-sm text-amber-700 font-light">{data.blockNote}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.hotels.map(hotel => (
            <div
              key={hotel.id}
              className={`relative rounded-2xl overflow-hidden border shadow-sm hover:shadow-md transition-shadow bg-white ${
                hotel.recommended ? 'border-rose-200 ring-1 ring-rose-100' : 'border-stone-100'
              }`}
            >
              {hotel.recommended && (
                <div className="absolute top-3 left-3 z-10">
                  <span className="px-2.5 py-1 bg-rose-500 text-white text-xs font-medium rounded-full">
                    Recommended
                  </span>
                </div>
              )}

              {hotel.image && (
                <div className="aspect-[16/9] overflow-hidden">
                  <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-medium text-stone-900 text-base leading-tight">{hotel.name}</h3>
                    {hotel.stars > 0 && (
                      <div className="flex items-center gap-0.5 mt-1">
                        {Array.from({ length: hotel.stars }).map((_, i) => (
                          <Star key={i} size={10} fill="currentColor" className="text-amber-400" />
                        ))}
                      </div>
                    )}
                  </div>
                  {hotel.url && (
                    <a href={hotel.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={14} className="text-stone-400 hover:text-stone-600 flex-shrink-0 transition-colors" />
                    </a>
                  )}
                </div>

                <div className="space-y-1.5 text-sm text-stone-500">
                  {hotel.distance && (
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-stone-400 flex-shrink-0" />
                      <span>{hotel.distance}</span>
                    </div>
                  )}
                  {hotel.priceRange && (
                    <p className="font-medium text-stone-700">{hotel.priceRange}</p>
                  )}
                  {hotel.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-stone-400 flex-shrink-0" />
                      <a href={`tel:${hotel.phone}`} className="hover:text-stone-700 transition-colors">{hotel.phone}</a>
                    </div>
                  )}
                </div>

                {hotel.bookingCode && (
                  <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-100">
                    <p className="text-xs text-stone-500">Booking code:</p>
                    <p className="font-mono font-semibold text-stone-800 text-sm mt-0.5">{hotel.bookingCode}</p>
                  </div>
                )}

                {hotel.notes && (
                  <p className="text-xs text-stone-400 leading-relaxed">{hotel.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const accommodationsCardsDefinition: SectionDefinition<AccommodationsCardsData> = {
  type: 'accommodations',
  variant: 'cards',
  schema: accommodationsCardsSchema,
  defaultData: defaultAccommodationsCardsData,
  Component: AccommodationsCards,
};
