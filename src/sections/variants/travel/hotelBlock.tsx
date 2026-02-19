import React from 'react';
import { z } from 'zod';
import { MapPin, Phone, ExternalLink, Star, Tag, Bus, Clock } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const HotelSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  stars: z.number().min(0).max(5).default(4),
  distance: z.string().default(''),
  priceRange: z.string().default(''),
  bookingCode: z.string().default(''),
  bookingDeadline: z.string().default(''),
  phone: z.string().default(''),
  url: z.string().default(''),
  image: z.string().default(''),
  amenities: z.array(z.string()).default([]),
  shuttleInfo: z.string().default(''),
  notes: z.string().default(''),
  recommended: z.boolean().default(false),
});

export const travelHotelBlockSchema = z.object({
  eyebrow: z.string().default('Where to stay'),
  headline: z.string().default('Hotel Room Blocks'),
  subheadline: z.string().default(''),
  deadlineNote: z.string().default(''),
  generalNote: z.string().default(''),
  hotels: z.array(HotelSchema).default([]),
  showAmenities: z.boolean().default(true),
  showShuttle: z.boolean().default(true),
});

export type TravelHotelBlockData = z.infer<typeof travelHotelBlockSchema>;

export const defaultTravelHotelBlockData: TravelHotelBlockData = {
  eyebrow: 'Where to stay',
  headline: 'Hotel Room Blocks',
  subheadline: 'We\'ve secured discounted room blocks at the following hotels.',
  deadlineNote: 'Room blocks expire May 1, 2025. Book early to secure your rate.',
  generalNote: 'Mention our wedding when booking to receive the group rate.',
  showAmenities: true,
  showShuttle: true,
  hotels: [
    {
      id: '1',
      name: 'The Lowell Hotel',
      stars: 5,
      distance: '0.4 miles from venue',
      priceRange: '$289 – $450/night',
      bookingCode: 'SMITH2025',
      bookingDeadline: 'April 30, 2025',
      phone: '+1 (212) 838-1400',
      url: '',
      image: 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800',
      amenities: ['Rooftop Pool', 'Full-Service Spa', 'Complimentary Breakfast'],
      shuttleInfo: 'Shuttle to venue at 3:30 PM. Return at midnight.',
      notes: '',
      recommended: true,
    },
    {
      id: '2',
      name: 'Baccarat Hotel & Residences',
      stars: 5,
      distance: '0.2 miles from venue',
      priceRange: '$395 – $600/night',
      bookingCode: '',
      bookingDeadline: '',
      phone: '+1 (212) 790-8800',
      url: '',
      image: 'https://images.pexels.com/photos/2869215/pexels-photo-2869215.jpeg?auto=compress&cs=tinysrgb&w=800',
      amenities: ['Michelin-Starred Restaurant', 'Infinity Pool', 'Concierge'],
      shuttleInfo: '',
      notes: 'Walking distance to venue. No shuttle, but rideshare is easy.',
      recommended: false,
    },
    {
      id: '3',
      name: 'The Benjamin Royal Sonesta',
      stars: 4,
      distance: '0.6 miles from venue',
      priceRange: '$189 – $299/night',
      bookingCode: 'WEDDING25',
      bookingDeadline: 'April 30, 2025',
      phone: '+1 (212) 715-2500',
      url: '',
      image: 'https://images.pexels.com/photos/1010657/pexels-photo-1010657.jpeg?auto=compress&cs=tinysrgb&w=800',
      amenities: ['Pet-Friendly', 'Free Cancellation', 'Restaurant On-Site'],
      shuttleInfo: 'Shuttle to venue at 3:45 PM.',
      notes: '',
      recommended: false,
    },
  ],
};

const StarRating: React.FC<{ stars: number }> = ({ stars }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: stars }).map((_, i) => (
      <Star key={i} size={9} fill="currentColor" className="text-amber-400" />
    ))}
  </div>
);

const TravelHotelBlock: React.FC<SectionComponentProps<TravelHotelBlockData>> = ({ data }) => {
  return (
    <section className="py-24 md:py-32 bg-stone-50" id="travel">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="text-center mb-12">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">
              {data.eyebrow}
            </p>
          )}
          <h2 className="text-4xl md:text-5xl font-light text-stone-900 mb-3">{data.headline}</h2>
          {data.subheadline && (
            <p className="text-stone-500 font-light max-w-xl mx-auto">{data.subheadline}</p>
          )}
        </div>

        {(data.deadlineNote || data.generalNote) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {data.deadlineNote && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <Clock size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 leading-relaxed">{data.deadlineNote}</p>
              </div>
            )}
            {data.generalNote && (
              <div className="flex items-start gap-3 p-4 bg-white border border-stone-100 rounded-xl">
                <Tag size={15} className="text-stone-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-stone-600 leading-relaxed">{data.generalNote}</p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.hotels.map(hotel => (
            <div
              key={hotel.id}
              className={`relative bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-md transition-shadow flex flex-col ${
                hotel.recommended ? 'border-rose-200 ring-1 ring-rose-100' : 'border-stone-100'
              }`}
            >
              {hotel.recommended && (
                <div className="absolute top-3 left-3 z-10">
                  <span className="px-2.5 py-1 bg-rose-500 text-white text-[10px] font-semibold rounded-full uppercase tracking-wide">
                    Recommended
                  </span>
                </div>
              )}

              {hotel.image && (
                <div className="aspect-[16/9] overflow-hidden flex-shrink-0">
                  <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-stone-900 text-base leading-tight">{hotel.name}</h3>
                  {hotel.url && (
                    <a href={hotel.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 mt-0.5">
                      <ExternalLink size={13} className="text-stone-300 hover:text-stone-600 transition-colors" />
                    </a>
                  )}
                </div>

                {hotel.stars > 0 && <StarRating stars={hotel.stars} />}

                <div className="mt-3 space-y-1.5 text-sm">
                  {hotel.distance && (
                    <div className="flex items-center gap-2 text-stone-500">
                      <MapPin size={12} className="text-stone-400 flex-shrink-0" />
                      <span>{hotel.distance}</span>
                    </div>
                  )}
                  {hotel.priceRange && (
                    <p className="font-semibold text-stone-800 text-sm">{hotel.priceRange}</p>
                  )}
                  {hotel.phone && (
                    <div className="flex items-center gap-2 text-stone-500">
                      <Phone size={12} className="text-stone-400 flex-shrink-0" />
                      <a href={`tel:${hotel.phone}`} className="hover:text-stone-800 transition-colors">{hotel.phone}</a>
                    </div>
                  )}
                </div>

                {hotel.bookingCode && (
                  <div className="mt-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-stone-400 uppercase tracking-wide font-medium">Booking code</p>
                        <p className="font-mono font-bold text-stone-800 text-sm mt-0.5">{hotel.bookingCode}</p>
                      </div>
                      {hotel.bookingDeadline && (
                        <div className="text-right">
                          <p className="text-[10px] text-stone-400 uppercase tracking-wide font-medium">Expires</p>
                          <p className="text-xs text-stone-600 font-medium mt-0.5">{hotel.bookingDeadline}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {data.showShuttle && hotel.shuttleInfo && (
                  <div className="mt-3 flex items-start gap-2 text-sm text-teal-700 bg-teal-50 rounded-xl px-3 py-2.5 border border-teal-100">
                    <Bus size={13} className="flex-shrink-0 mt-0.5 text-teal-500" />
                    <span className="text-xs leading-relaxed">{hotel.shuttleInfo}</span>
                  </div>
                )}

                {data.showAmenities && hotel.amenities.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {hotel.amenities.map((a, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 bg-stone-50 border border-stone-100 text-stone-500 rounded-full font-medium">
                        {a}
                      </span>
                    ))}
                  </div>
                )}

                {hotel.notes && (
                  <p className="mt-3 text-xs text-stone-400 leading-relaxed">{hotel.notes}</p>
                )}

                {hotel.url && (
                  <div className="mt-auto pt-4">
                    <a
                      href={hotel.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 w-full py-2 border border-stone-200 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition-all"
                    >
                      <ExternalLink size={12} />
                      Book Now
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const travelHotelBlockDefinition: SectionDefinition<TravelHotelBlockData> = {
  type: 'travel',
  variant: 'hotelBlock',
  schema: travelHotelBlockSchema,
  defaultData: defaultTravelHotelBlockData,
  Component: TravelHotelBlock,
};
