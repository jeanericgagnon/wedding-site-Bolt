import React from 'react';
import { z } from 'zod';
import { Heart } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const PartyMemberSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  role: z.string().default(''),
  photo: z.string().default(''),
  note: z.string().default(''),
  side: z.enum(['partner1', 'partner2', 'both']).default('partner1'),
});

export const weddingPartyStoryBiosSchema = z.object({
  eyebrow: z.string().default('Our people'),
  headline: z.string().default('Wedding Party'),
  subheadline: z.string().default('The friends and family who mean the world to us.'),
  members: z.array(PartyMemberSchema).default([]),
  groupBySide: z.boolean().default(true),
  partner1Label: z.string().default('Partner 1 Side'),
  partner2Label: z.string().default('Partner 2 Side'),
});

export type WeddingPartyStoryBiosData = z.infer<typeof weddingPartyStoryBiosSchema>;

export const defaultWeddingPartyStoryBiosData: WeddingPartyStoryBiosData = {
  eyebrow: 'Our people',
  headline: 'Wedding Party',
  subheadline: 'The friends and family who mean the world to us.',
  groupBySide: true,
  partner1Label: 'Bridal Party',
  partner2Label: "Groom's Party",
  members: [
    {
      id: '1',
      name: 'Emily Chen',
      role: 'Maid of Honor',
      photo: 'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=900',
      note: 'My sister, my co-pilot, and the person who kept me calm through every decision.',
      side: 'partner1',
    },
    {
      id: '2',
      name: 'Michael Torres',
      role: 'Best Man',
      photo: 'https://images.pexels.com/photos/1121796/pexels-photo-1121796.jpeg?auto=compress&cs=tinysrgb&w=900',
      note: 'Best friend since college and always the first to show up when it matters.',
      side: 'partner2',
    },
    {
      id: '3',
      name: 'Olivia Park',
      role: 'Bridesmaid',
      photo: 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=900',
      note: 'The planner of the group and a forever source of joy and laughter.',
      side: 'partner1',
    },
    {
      id: '4',
      name: 'David Kim',
      role: 'Groomsman',
      photo: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=900',
      note: 'Travel buddy, adventure partner, and genuinely one of the kindest humans I know.',
      side: 'partner2',
    },
  ],
};

const BioCard: React.FC<{ member: z.infer<typeof PartyMemberSchema>; reversed?: boolean }> = ({ member, reversed }) => (
  <article className={`grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-7 items-center rounded-3xl border border-border/35 bg-white p-5 md:p-7 shadow-[0_8px_28px_rgba(15,23,42,0.06)] ${reversed ? 'md:[&>*:first-child]:order-2' : ''}`}>
    <div className="aspect-[4/3] md:aspect-[5/4] rounded-2xl overflow-hidden bg-surface-subtle">
      {member.photo ? (
        <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-text-tertiary text-4xl font-light">
          {member.name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-primary/80 mb-2">{member.role || 'Wedding Party'}</p>
      <h3 className="text-2xl md:text-3xl font-light text-text-primary leading-tight">{member.name}</h3>
      {member.note && <p className="mt-3 text-sm md:text-base text-text-secondary leading-relaxed">{member.note}</p>}
    </div>
  </article>
);

const WeddingPartyStoryBios: React.FC<SectionComponentProps<WeddingPartyStoryBiosData>> = ({ data }) => {
  const partner1Members = data.members.filter((m) => m.side === 'partner1' || m.side === 'both');
  const partner2Members = data.members.filter((m) => m.side === 'partner2' || m.side === 'both');
  const list = data.groupBySide ? [
    { label: data.partner1Label, members: partner1Members },
    { label: data.partner2Label, members: partner2Members },
  ] : [{ label: '', members: data.members }];

  return (
    <section className="py-20 md:py-28 bg-surface" id="wedding-party">
      <div className="max-w-6xl mx-auto px-5 md:px-10">
        <div className="text-center mb-10 md:mb-14">
          {data.eyebrow && <p className="text-xs uppercase tracking-[0.24em] text-text-tertiary mb-3">{data.eyebrow}</p>}
          <h2 className="text-3xl md:text-5xl font-light text-text-primary">{data.headline}</h2>
          {data.subheadline && <p className="mt-3 text-sm md:text-base text-text-secondary max-w-2xl mx-auto">{data.subheadline}</p>}
        </div>

        <div className="space-y-10 md:space-y-14">
          {list.map((group, groupIndex) => (
            <div key={`${group.label}-${groupIndex}`} className="space-y-4 md:space-y-5">
              {group.label ? (
                <div className="flex items-center gap-3">
                  <Heart className="w-4 h-4 text-primary/70" />
                  <p className="text-xs uppercase tracking-[0.2em] text-text-tertiary">{group.label}</p>
                  <div className="h-px flex-1 bg-border/60" />
                </div>
              ) : null}

              <div className="space-y-4 md:space-y-6">
                {group.members.map((member, index) => (
                  <BioCard key={member.id || `${groupIndex}-${index}`} member={member} reversed={index % 2 === 1} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const weddingPartyStoryBiosDefinition: SectionDefinition<WeddingPartyStoryBiosData> = {
  type: 'weddingParty',
  variant: 'storyBios',
  schema: weddingPartyStoryBiosSchema,
  defaultData: defaultWeddingPartyStoryBiosData,
  Component: WeddingPartyStoryBios,
};
