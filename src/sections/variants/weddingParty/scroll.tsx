import React from 'react';
import { z } from 'zod';
import { SectionDefinition, SectionComponentProps } from '../../types';

const PartyMemberSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  role: z.string().default(''),
  photo: z.string().default(''),
  note: z.string().default(''),
  side: z.enum(['partner1', 'partner2', 'both']).default('partner1'),
});

export const weddingPartyScrollSchema = z.object({
  eyebrow: z.string().default('Wedding Party'),
  headline: z.string().default('The Crew'),
  subheadline: z.string().default(''),
  members: z.array(PartyMemberSchema).default([]),
});

export type WeddingPartyScrollData = z.infer<typeof weddingPartyScrollSchema>;

export const defaultWeddingPartyScrollData: WeddingPartyScrollData = {
  eyebrow: 'Wedding Party',
  headline: 'The Crew',
  subheadline: '',
  members: [
    { id: '1', name: 'Emily Chen', role: 'Maid of Honor', photo: 'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=600', note: '', side: 'partner1' },
    { id: '2', name: 'Olivia Park', role: 'Bridesmaid', photo: 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=600', note: '', side: 'partner1' },
    { id: '3', name: 'Michael Torres', role: 'Best Man', photo: 'https://images.pexels.com/photos/1121796/pexels-photo-1121796.jpeg?auto=compress&cs=tinysrgb&w=600', note: '', side: 'partner2' },
    { id: '4', name: 'David Kim', role: 'Groomsman', photo: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=600', note: '', side: 'partner2' },
  ],
};

const WeddingPartyScroll: React.FC<SectionComponentProps<WeddingPartyScrollData>> = ({ data }) => {
  return (
    <section className="py-20 md:py-28 bg-surface" id="wedding-party">
      <div className="max-w-6xl mx-auto px-5 md:px-10">
        <div className="text-center mb-8 md:mb-10">
          <p className="text-xs uppercase tracking-[0.24em] text-text-tertiary mb-3">{data.eyebrow}</p>
          <h2 className="text-3xl md:text-5xl font-light text-text-primary">{data.headline}</h2>
          {data.subheadline ? <p className="mt-3 text-sm text-text-secondary">{data.subheadline}</p> : null}
        </div>

        {data.members.length === 0 ? (
          <div className="rounded-2xl border border-border/40 bg-white p-8 text-center">
            <p className="text-sm text-text-secondary">Add wedding party members to display the scroll layout.</p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2" aria-label="Wedding party members">
            {data.members.map((m) => (
              <article key={m.id} className="snap-start shrink-0 w-[220px] rounded-2xl border border-border/30 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                <div className="aspect-[3/4] rounded-xl overflow-hidden bg-surface-subtle mb-3">
                  {m.photo ? (
                    <img src={m.photo} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-tertiary text-3xl font-light">{m.name.charAt(0).toUpperCase()}</div>
                  )}
                </div>
                <p className="text-sm font-medium text-text-primary">{m.name}</p>
                {m.role ? <p className="text-xs text-text-secondary mt-0.5">{m.role}</p> : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export const weddingPartyScrollDefinition: SectionDefinition<WeddingPartyScrollData> = {
  type: 'weddingParty',
  variant: 'scroll',
  schema: weddingPartyScrollSchema,
  defaultData: defaultWeddingPartyScrollData,
  Component: WeddingPartyScroll,
};
