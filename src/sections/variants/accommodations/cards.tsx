import React from 'react';
import { z } from 'zod';
import { MapPin, Phone, ExternalLink, Star } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';
import { getSafePublicImageUrl, getSafePublicTelHref, getSafePublicWebUrl } from '../../publicLinks';

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
  title: z.string().default(''),
  headline: z.string().default('Accommodations'),
  generalNote: z.string().default(''),
  blockNote: z.string().default(''),
  hotels: z.array(AccommodationSchema).default([]),
  layoutStyle: z.enum(['cards', 'list', 'featured', 'mapList', 'faqStyle', 'onSite']).default('cards'),
  mapImage: z.string().default(''),
  shuttleNote: z.string().default(''),
});

export type AccommodationsCardsData = z.infer<typeof accommodationsCardsSchema>;

export const defaultAccommodationsCardsData: AccommodationsCardsData = {
  eyebrow: 'Where to stay',
  title: '',
  headline: 'Accommodations',
  generalNote: 'We\'ve secured room blocks at the hotels below. Mention our wedding when booking to receive the discounted rate.',
  blockNote: 'Room blocks expire May 1st, 2025. Book early to secure your rate.',
  layoutStyle: 'cards',
  mapImage: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=85',
  shuttleNote: 'A shuttle will loop between the featured hotel and the venue before the ceremony and after the reception.',
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
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85',
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
      image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=85',
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
      image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=85',
      notes: 'Pet-friendly. Free cancellation within 48 hours.',
      recommended: false,
    },
  ],
};

const AccommodationsCards: React.FC<SectionComponentProps<AccommodationsCardsData>> = ({ data }) => {
  const hotels = data.hotels.length > 0 ? data.hotels : defaultAccommodationsCardsData.hotels;
  const featuredHotel = hotels.find((hotel) => hotel.recommended) ?? hotels[0];
  const headline = data.headline || data.title || 'Accommodations';

  if (data.layoutStyle === 'list') {
    return (
      <section className="py-24 md:py-32 bg-white" id="accommodations">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <div className="mb-12">
            {data.eyebrow && <p className="text-sm text-stone-400 font-light mb-4">{data.eyebrow}</p>}
            <h2 className="text-4xl md:text-6xl font-light text-stone-950">{headline}</h2>
            {data.generalNote && <p className="mt-4 max-w-2xl text-stone-500 leading-relaxed">{data.generalNote}</p>}
          </div>
          <div className="divide-y divide-stone-100 border-y border-stone-100">
            {hotels.map((hotel) => {
              const safeHotelUrl = getSafePublicWebUrl(hotel.url);
              const safeHotelPhoneHref = getSafePublicTelHref(hotel.phone);
              return (
              <div key={hotel.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 py-6">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-light text-stone-950">{hotel.name}</h3>
                    {hotel.recommended && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">Recommended</span>}
                  </div>
                  <p className="mt-2 text-sm text-stone-500">{[hotel.distance, hotel.priceRange].filter(Boolean).join(' · ')}</p>
                  {hotel.notes && <p className="mt-2 text-sm text-stone-500 leading-relaxed">{hotel.notes}</p>}
                </div>
                <div className="flex flex-wrap md:justify-end items-center gap-2">
                  {hotel.bookingCode && <span className="rounded-full border border-stone-200 px-3 py-1.5 text-xs font-mono text-stone-700">{hotel.bookingCode}</span>}
                  {safeHotelPhoneHref && <a href={safeHotelPhoneHref} className="rounded-full bg-stone-950 px-3 py-1.5 text-xs font-medium text-white">Call</a>}
                  {safeHotelUrl && <a href={safeHotelUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700">Book</a>}
                </div>
              </div>
              );
            })}
          </div>
          {data.blockNote && <p className="mt-6 text-sm text-amber-700">{data.blockNote}</p>}
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'featured' && featuredHotel) {
    const safeFeaturedHotelUrl = getSafePublicWebUrl(featuredHotel.url);
    const safeFeaturedHotelImage = getSafePublicImageUrl(featuredHotel.image);
    const safeFeaturedHotelPhoneHref = getSafePublicTelHref(featuredHotel.phone);
    return (
      <section className="py-28 md:py-36 bg-stone-950 text-white" id="accommodations">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
            <div>
              {data.eyebrow && <p className="text-sm text-white/45 font-light mb-4">{data.eyebrow}</p>}
              <h2 className="text-4xl md:text-6xl font-light">{featuredHotel.name}</h2>
              <p className="mt-4 text-white/60 leading-relaxed">{data.generalNote || featuredHotel.notes}</p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[featuredHotel.distance, featuredHotel.priceRange, featuredHotel.bookingCode ? `Code ${featuredHotel.bookingCode}` : 'Room block'].filter(Boolean).map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm text-white/75">{item}</div>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                {safeFeaturedHotelUrl && <a href={safeFeaturedHotelUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-stone-950">Book block <ExternalLink size={14} /></a>}
                {safeFeaturedHotelPhoneHref && <a href={safeFeaturedHotelPhoneHref} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white">Call hotel <Phone size={14} /></a>}
              </div>
            </div>
            {safeFeaturedHotelImage && (
              <div className="aspect-[4/5] overflow-hidden rounded-[2rem] bg-white/10">
                <img src={safeFeaturedHotelImage} alt={featuredHotel.name} className="h-full w-full object-cover" />
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'mapList') {
    const safeMapImage = getSafePublicImageUrl(data.mapImage);
    return (
      <section className="py-28 md:py-36 bg-stone-50" id="accommodations">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="text-center mb-12">
            {data.eyebrow && <p className="text-sm text-stone-400 font-light mb-4">{data.eyebrow}</p>}
            <h2 className="text-4xl md:text-5xl font-light text-stone-950">{headline}</h2>
            {data.generalNote && <p className="mt-4 max-w-2xl mx-auto text-stone-500">{data.generalNote}</p>}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8">
            <div className="min-h-[460px] rounded-[2rem] bg-stone-200 overflow-hidden relative">
              {safeMapImage ? <img src={safeMapImage} alt="" className="h-full w-full object-cover opacity-80" /> : null}
              <div className="absolute inset-0 bg-gradient-to-br from-stone-950/20 to-stone-950/50" />
              {hotels.slice(0, 4).map((hotel, index) => (
                <div
                  key={hotel.id}
                  className="absolute rounded-full bg-white px-3 py-1.5 text-xs font-medium text-stone-800 shadow-lg"
                  style={{ left: `${18 + (index * 18) % 60}%`, top: `${18 + (index * 16) % 58}%` }}
                >
                  {index + 1}. {hotel.name.split(' ')[0]}
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {hotels.map((hotel, index) => (
                <div key={hotel.id} className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-950 text-xs font-medium text-white">{index + 1}</span>
                    <div>
                      <h3 className="font-medium text-stone-950">{hotel.name}</h3>
                      <p className="mt-1 text-sm text-stone-500">{[hotel.distance, hotel.priceRange].filter(Boolean).join(' · ')}</p>
                      {hotel.bookingCode && <p className="mt-2 text-xs font-mono text-stone-700">Code {hotel.bookingCode}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'faqStyle') {
    const faqs = [
      data.blockNote ? { q: 'When should we book?', a: data.blockNote } : null,
      data.shuttleNote ? { q: 'Is there transportation?', a: data.shuttleNote } : null,
      featuredHotel?.bookingCode ? { q: 'What code should we use?', a: `Use ${featuredHotel.bookingCode} when booking ${featuredHotel.name}.` } : null,
      data.generalNote ? { q: 'Which hotel do you recommend?', a: data.generalNote } : null,
    ].filter(Boolean) as Array<{ q: string; a: string }>;
    return (
      <section className="py-28 md:py-36 bg-white" id="accommodations">
        <div className="max-w-4xl mx-auto px-6 md:px-12">
          <div className="text-center mb-12">
            {data.eyebrow && <p className="text-sm text-stone-400 font-light mb-4">{data.eyebrow}</p>}
            <h2 className="text-4xl md:text-5xl font-light text-stone-950">{headline}</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-stone-100 bg-stone-50 p-6">
                <p className="font-medium text-stone-950">{faq.q}</p>
                <p className="mt-2 text-sm text-stone-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'onSite' && featuredHotel) {
    const safeFeaturedHotelImage = getSafePublicImageUrl(featuredHotel.image);
    return (
      <section className="py-28 md:py-36 bg-gradient-to-b from-white to-stone-50" id="accommodations">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="rounded-[2.25rem] overflow-hidden border border-stone-100 bg-white shadow-xl shadow-stone-900/5">
            {safeFeaturedHotelImage && <img src={safeFeaturedHotelImage} alt={featuredHotel.name} className="h-[320px] md:h-[460px] w-full object-cover" />}
            <div className="p-7 md:p-10 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8">
              <div>
                {data.eyebrow && <p className="text-sm text-stone-400 font-light mb-4">{data.eyebrow}</p>}
                <h2 className="text-4xl md:text-5xl font-light text-stone-950">{featuredHotel.name}</h2>
                <p className="mt-4 text-stone-500 leading-relaxed">{featuredHotel.notes || data.generalNote}</p>
              </div>
              <div className="rounded-2xl bg-stone-50 p-5 min-w-[240px]">
                <p className="text-sm text-stone-400">Stay details</p>
                <div className="mt-4 space-y-2 text-sm text-stone-600">
                  {featuredHotel.distance && <p>{featuredHotel.distance}</p>}
                  {featuredHotel.priceRange && <p>{featuredHotel.priceRange}</p>}
                  {featuredHotel.bookingCode && <p className="font-mono text-stone-900">{featuredHotel.bookingCode}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-28 md:py-36 bg-stone-50" id="accommodations">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="text-center mb-14">
          {data.eyebrow && (
            <p className="text-sm text-stone-400 font-light mb-4">
              {data.eyebrow}
            </p>
          )}
          <h2 className="text-4xl md:text-5xl font-light text-stone-900 mb-4">{headline}</h2>
          {data.generalNote && (
            <p className="text-stone-500 font-light max-w-2xl mx-auto">{data.generalNote}</p>
          )}
        </div>

        {data.blockNote && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-xl text-center">
            <p className="text-sm text-amber-700 font-light">{data.blockNote}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {hotels.map(hotel => {
            const safeHotelUrl = getSafePublicWebUrl(hotel.url);
            const safeHotelPhoneHref = getSafePublicTelHref(hotel.phone);
            return (
            <div
              key={hotel.id}
              className={`group relative rounded-[1.75rem] overflow-hidden border shadow-sm hover:shadow-xl transition-shadow bg-white ${
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

              {getSafePublicImageUrl(hotel.image) && (
                <div className="aspect-[16/9] overflow-hidden">
                  <img src={getSafePublicImageUrl(hotel.image)} alt={hotel.name} className="w-full h-full object-cover scale-[1.02] group-hover:scale-105 transition-transform duration-700" />
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
                  {safeHotelUrl && (
                    <a href={safeHotelUrl} target="_blank" rel="noopener noreferrer">
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
                  {safeHotelPhoneHref && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-stone-400 flex-shrink-0" />
                      <a href={safeHotelPhoneHref} className="hover:text-stone-700 transition-colors">{hotel.phone}</a>
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
            );
          })}
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

function accommodationsVariant(variant: string, layoutStyle: AccommodationsCardsData['layoutStyle'], overrides: Partial<AccommodationsCardsData> = {}): SectionDefinition<AccommodationsCardsData> {
  return {
    type: 'accommodations',
    variant,
    schema: accommodationsCardsSchema,
    defaultData: { ...defaultAccommodationsCardsData, layoutStyle, ...overrides },
    Component: AccommodationsCards,
  };
}

export const accommodationsListDefinition = accommodationsVariant('list', 'list');
export const accommodationsFeaturedDefinition = accommodationsVariant('featured', 'featured');
export const accommodationsMapListDefinition = accommodationsVariant('mapList', 'mapList');
export const accommodationsFaqStyleDefinition = accommodationsVariant('faqStyle', 'faqStyle');
export const accommodationsOnSiteDefinition = accommodationsVariant('onSite', 'onSite');
