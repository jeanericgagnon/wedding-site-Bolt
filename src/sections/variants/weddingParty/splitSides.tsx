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

export const weddingPartySplitSidesSchema = z.object({
  eyebrow: z.string().default('Wedding Party'),
  headline: z.string().default('Meet Our People'),
  subheadline: z.string().default(''),
  members: z.array(PartyMemberSchema).default([]),
  partner1Label: z.string().default('Partner 1 Side'),
  partner2Label: z.string().default('Partner 2 Side'),
});

export type WeddingPartySplitSidesData = z.infer<typeof weddingPartySplitSidesSchema>;

export const defaultWeddingPartySplitSidesData: WeddingPartySplitSidesData = {
  eyebrow: 'Wedding Party',
  headline: 'Meet Our People',
  subheadline: '',
  partner1Label: 'Partner 1 Side',
  partner2Label: 'Partner 2 Side',
  members: [
    { id: '1', name: 'Emily Chen', role: 'Maid of Honor', photo: '', note: '', side: 'partner1' },
    { id: '2', name: 'Olivia Park', role: 'Bridesmaid', photo: '', note: '', side: 'partner1' },
    { id: '3', name: 'Michael Torres', role: 'Best Man', photo: '', note: '', side: 'partner2' },
    { id: '4', name: 'David Kim', role: 'Groomsman', photo: '', note: '', side: 'partner2' },
  ],
};

const SplitCard: React.FC<{ title: string; members: z.infer<typeof PartyMemberSchema>[]; accent?: boolean }> = ({ title, members, accent }) => (
  <div className={`rounded-3xl border p-5 md:p-7 ${accent ? 'bg-primary/5 border-primary/20' : 'bg-white border-border/40'}`}>
    <p className="text-xs uppercase tracking-[0.2em] text-text-tertiary mb-4">{title}</p>
    {members.length === 0 ? (
      <p className="text-sm text-text-secondary">No members added yet.</p>
    ) : (
      <div className="space-y-3">
        {members.map((m) => (
          <div key={m.id} className="rounded-xl border border-border/40 bg-white px-3.5 py-3">
            <p className="text-sm font-medium text-text-primary">{m.name}</p>
            {m.role && <p className="text-xs text-text-secondary mt-0.5">{m.role}</p>}
            {m.note && <p className="text-xs text-text-tertiary mt-1.5">{m.note}</p>}
          </div>
        ))}
      </div>
    )}
  </div>
);

const WeddingPartySplitSides: React.FC<SectionComponentProps<WeddingPartySplitSidesData>> = ({ data }) => {
  const partner1 = data.members.filter((m) => m.side === 'partner1' || m.side === 'both');
  const partner2 = data.members.filter((m) => m.side === 'partner2' || m.side === 'both');

  return (
    <section className="py-20 md:py-28 bg-surface" id="wedding-party">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="text-center mb-10 md:mb-14">
          <p className="text-xs uppercase tracking-[0.24em] text-text-tertiary mb-3">{data.eyebrow}</p>
          <h2 className="text-3xl md:text-5xl font-light text-text-primary">{data.headline}</h2>
          {data.subheadline && <p className="mt-3 text-sm text-text-secondary">{data.subheadline}</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
          <SplitCard title={data.partner1Label} members={partner1} accent />
          <SplitCard title={data.partner2Label} members={partner2} />
        </div>
      </div>
    </section>
  );
};

export const weddingPartySplitSidesDefinition: SectionDefinition<WeddingPartySplitSidesData> = {
  type: 'weddingParty',
  variant: 'splitSides',
  schema: weddingPartySplitSidesSchema,
  defaultData: defaultWeddingPartySplitSidesData,
  Component: WeddingPartySplitSides,
};
