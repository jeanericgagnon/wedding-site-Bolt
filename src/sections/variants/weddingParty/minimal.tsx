import React from 'react';
import { z } from 'zod';
import { SectionDefinition, SectionComponentProps } from '../../types';

const PartyMemberSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  role: z.string().default(''),
  side: z.enum(['partner1', 'partner2', 'both']).default('partner1'),
});

export const weddingPartyMinimalSchema = z.object({
  eyebrow: z.string().default('Wedding Party'),
  headline: z.string().default('Our People'),
  subheadline: z.string().default(''),
  members: z.array(PartyMemberSchema).default([]),
  partner1Label: z.string().default('Partner 1 Side'),
  partner2Label: z.string().default('Partner 2 Side'),
});

export type WeddingPartyMinimalData = z.infer<typeof weddingPartyMinimalSchema>;

export const defaultWeddingPartyMinimalData: WeddingPartyMinimalData = {
  eyebrow: 'Wedding Party',
  headline: 'Our People',
  subheadline: '',
  partner1Label: 'Partner 1 Side',
  partner2Label: 'Partner 2 Side',
  members: [
    { id: '1', name: 'Emily Chen', role: 'Maid of Honor', side: 'partner1' },
    { id: '2', name: 'Olivia Park', role: 'Bridesmaid', side: 'partner1' },
    { id: '3', name: 'Michael Torres', role: 'Best Man', side: 'partner2' },
    { id: '4', name: 'David Kim', role: 'Groomsman', side: 'partner2' },
  ],
};

const WeddingPartyMinimal: React.FC<SectionComponentProps<WeddingPartyMinimalData>> = ({ data }) => {
  const partner1 = data.members.filter((m) => m.side === 'partner1' || m.side === 'both');
  const partner2 = data.members.filter((m) => m.side === 'partner2' || m.side === 'both');

  return (
    <section className="py-20 md:py-28 bg-white" id="wedding-party">
      <div className="max-w-4xl mx-auto px-5 md:px-8">
        <div className="text-center mb-10 md:mb-14">
          <p className="text-xs uppercase tracking-[0.24em] text-text-tertiary mb-3">{data.eyebrow}</p>
          <h2 className="text-3xl md:text-5xl font-light text-text-primary">{data.headline}</h2>
          {data.subheadline && <p className="mt-3 text-sm text-text-secondary">{data.subheadline}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-text-tertiary mb-4">{data.partner1Label}</p>
            <ul className="space-y-3">
              {partner1.map((m) => (
                <li key={m.id} className="border-b border-border/45 pb-2">
                  <p className="text-base text-text-primary">{m.name}</p>
                  {m.role && <p className="text-xs text-text-secondary mt-0.5">{m.role}</p>}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-text-tertiary mb-4">{data.partner2Label}</p>
            <ul className="space-y-3">
              {partner2.map((m) => (
                <li key={m.id} className="border-b border-border/45 pb-2">
                  <p className="text-base text-text-primary">{m.name}</p>
                  {m.role && <p className="text-xs text-text-secondary mt-0.5">{m.role}</p>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export const weddingPartyMinimalDefinition: SectionDefinition<WeddingPartyMinimalData> = {
  type: 'weddingParty',
  variant: 'minimal',
  schema: weddingPartyMinimalSchema,
  defaultData: defaultWeddingPartyMinimalData,
  Component: WeddingPartyMinimal,
};
