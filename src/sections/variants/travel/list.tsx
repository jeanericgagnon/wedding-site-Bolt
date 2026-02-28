import React from 'react';
import { z } from 'zod';
import { Plane, Car, Hotel, ExternalLink } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const HotelSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  distance: z.string().default(''),
  price: z.string().default(''),
  bookingCode: z.string().default(''),
  phone: z.string().default(''),
  url: z.string().default(''),
  notes: z.string().default(''),
});

export const travelListSchema = z.object({
  eyebrow: z.string().default('Getting here'),
  headline: z.string().default('Travel & Accommodations'),
  flightInfo: z.string().default(''),
  drivingInfo: z.string().default(''),
  parkingInfo: z.string().default(''),
  shuttleInfo: z.string().default(''),
  hotels: z.array(HotelSchema).default([]),
  generalNote: z.string().default(''),
});

export type TravelListData = z.infer<typeof travelListSchema>;

export const defaultTravelListData: TravelListData = {
  eyebrow: 'Getting here',
  headline: 'Travel & Accommodations',
  flightInfo: 'The closest major airport is JFK International (30 min) or Newark Liberty (45 min). We recommend flying into JFK for most guests.',
  drivingInfo: 'The venue is located on Park Avenue in Midtown Manhattan. Rideshare is recommended.',
  parkingInfo: 'Valet parking is available at the venue for $40. Several garages are within a 3-minute walk.',
  shuttleInfo: '',
  generalNote: 'A room block has been reserved at the hotels below. Mention the wedding for the discounted rate.',
  hotels: [
    {
      id: '1',
      name: 'The Lowell Hotel',
      distance: '0.4 miles from venue',
      price: 'From $289/night',
      bookingCode: 'SMITH2025',
      phone: '+1 (212) 838-1400',
      url: '',
      notes: 'Mention the wedding room block for discounted rate.',
    },
    {
      id: '2',
      name: 'Baccarat Hotel & Residences',
      distance: '0.2 miles from venue',
      price: 'From $395/night',
      bookingCode: '',
      phone: '+1 (212) 790-8800',
      url: '',
      notes: '',
    },
  ],
};

const TravelList: React.FC<SectionComponentProps<TravelListData>> = ({ data }) => {
  const travelItems = [
    { icon: Plane, label: 'By Air', content: data.flightInfo },
    { icon: Car, label: 'By Car', content: data.drivingInfo },
    { icon: Car, label: 'Parking', content: data.parkingInfo },
    { icon: Car, label: 'Shuttle', content: data.shuttleInfo },
  ].filter(item => item.content);

  return (
    <section className="py-28 md:py-36 bg-gradient-to-b from-stone-50 to-white" id="travel">
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">
              {data.eyebrow}
            </p>
          )}
          <h2 className="text-4xl md:text-6xl font-light text-stone-900 tracking-tight">{data.headline}</h2>
        </div>

        {travelItems.length > 0 && (
          <div className={`grid grid-cols-1 gap-6 mb-16 ${travelItems.length >= 4 ? 'md:grid-cols-2 lg:grid-cols-4' : travelItems.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            {travelItems.map(({ icon: Icon, label, content }) => (
              <div key={label} className="bg-white rounded-[1.5rem] p-7 border border-stone-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center">
                    <Icon size={15} className="text-stone-500" />
                  </div>
                  <h3 className="text-sm font-medium text-stone-700 uppercase tracking-wide">{label}</h3>
                </div>
                <p className="text-sm text-stone-500 leading-relaxed text-pretty">{content}</p>
              </div>
            ))}
          </div>
        )}

        {data.hotels.length > 0 && (
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center gap-2">
                <Hotel size={16} className="text-stone-400" />
                <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">Where to Stay</h3>
              </div>
              <div className="flex-1 h-px bg-stone-200" />
            </div>

            {data.generalNote && (
              <p className="text-sm text-stone-500 mb-6 bg-white rounded-xl p-4 border border-stone-100">
                {data.generalNote}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {data.hotels.map(hotel => (
                <div key={hotel.id} className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h4 className="text-base font-medium text-stone-900">{hotel.name}</h4>
                    {hotel.url && (
                      <a href={hotel.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                        <ExternalLink size={14} className="text-stone-400 hover:text-stone-600 transition-colors" />
                      </a>
                    )}
                  </div>
                  <div className="space-y-1.5 text-sm text-stone-500">
                    {hotel.distance && <p>{hotel.distance}</p>}
                    {hotel.price && <p className="font-medium text-stone-700">{hotel.price}</p>}
                    {hotel.bookingCode && (
                      <p>Code: <span className="font-mono font-medium text-stone-700 bg-stone-50 px-1.5 py-0.5 rounded text-xs">{hotel.bookingCode}</span></p>
                    )}
                    {hotel.phone && <p>{hotel.phone}</p>}
                    {hotel.notes && <p className="text-stone-400 text-xs leading-relaxed pt-1">{hotel.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export const travelListDefinition: SectionDefinition<TravelListData> = {
  type: 'travel',
  variant: 'list',
  schema: travelListSchema,
  defaultData: defaultTravelListData,
  Component: TravelList,
};
