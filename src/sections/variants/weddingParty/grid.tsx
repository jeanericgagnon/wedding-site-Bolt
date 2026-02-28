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

export const weddingPartyGridSchema = z.object({
  eyebrow: z.string().default('The crew'),
  headline: z.string().default('Wedding Party'),
  subheadline: z.string().default(''),
  members: z.array(PartyMemberSchema).default([]),
  groupBySide: z.boolean().default(false),
  partner1Label: z.string().default("Bridal Party"),
  partner2Label: z.string().default("Groom's Party"),
});

export type WeddingPartyGridData = z.infer<typeof weddingPartyGridSchema>;

export const defaultWeddingPartyGridData: WeddingPartyGridData = {
  eyebrow: 'The crew',
  headline: 'Wedding Party',
  subheadline: '',
  groupBySide: false,
  partner1Label: 'Bridal Party',
  partner2Label: "Groom's Party",
  members: [
    { id: '1', name: 'Emily Chen', role: 'Maid of Honor', photo: 'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=400', note: '', side: 'partner1' },
    { id: '2', name: 'Olivia Park', role: 'Bridesmaid', photo: 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=400', note: '', side: 'partner1' },
    { id: '3', name: 'Sophie Hall', role: 'Bridesmaid', photo: 'https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=400', note: '', side: 'partner1' },
    { id: '4', name: 'Michael Torres', role: 'Best Man', photo: 'https://images.pexels.com/photos/1121796/pexels-photo-1121796.jpeg?auto=compress&cs=tinysrgb&w=400', note: '', side: 'partner2' },
    { id: '5', name: 'David Kim', role: 'Groomsman', photo: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400', note: '', side: 'partner2' },
    { id: '6', name: 'Ryan Lee', role: 'Groomsman', photo: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400', note: '', side: 'partner2' },
  ],
};

const MemberCard: React.FC<{ member: z.infer<typeof PartyMemberSchema> }> = ({ member }) => (
  <div className="flex flex-col items-center text-center group max-w-[13rem]">
    <div className="relative mb-4">
      {member.photo ? (
        <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-stone-100 shadow-sm group-hover:shadow-xl group-hover:-translate-y-0.5 transition-all duration-300">
          <img src={member.photo} alt={member.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        </div>
      ) : (
        <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-stone-100 border-2 border-stone-200 flex items-center justify-center">
          <span className="text-2xl font-light text-stone-400">{member.name.charAt(0)}</span>
        </div>
      )}
    </div>
    <h3 className="font-medium text-stone-900 text-sm md:text-base">{member.name}</h3>
    <p className="text-xs text-stone-400 uppercase tracking-wide mt-0.5">{member.role}</p>
    {member.note && (
      <p className="text-xs text-stone-400 mt-1.5 max-w-[140px] leading-relaxed">{member.note}</p>
    )}
  </div>
);

const WeddingPartyGrid: React.FC<SectionComponentProps<WeddingPartyGridData>> = ({ data }) => {
  const partner1Members = data.members.filter(m => m.side === 'partner1' || m.side === 'both');
  const partner2Members = data.members.filter(m => m.side === 'partner2' || m.side === 'both');
  const allMembers = data.members;

  return (
    <section className="py-28 md:py-36 bg-white" id="wedding-party">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">
              {data.eyebrow}
            </p>
          )}
          <h2 className="text-4xl md:text-6xl font-light text-stone-900 mb-3 tracking-tight">{data.headline}</h2>
          {data.subheadline && (
            <p className="text-stone-500 font-light max-w-xl mx-auto">{data.subheadline}</p>
          )}
        </div>

        {data.groupBySide ? (
          <div className="space-y-16">
            {partner1Members.length > 0 && (
              <div>
                <p className="text-center text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-10">
                  {data.partner1Label}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10 justify-items-center">
                  {partner1Members.map(m => <MemberCard key={m.id} member={m} />)}
                </div>
              </div>
            )}
            {partner2Members.length > 0 && (
              <div>
                <div className="w-24 h-px bg-stone-100 mx-auto mb-16" />
                <p className="text-center text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-10">
                  {data.partner2Label}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10 justify-items-center">
                  {partner2Members.map(m => <MemberCard key={m.id} member={m} />)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 md:gap-10 justify-items-center">
            {allMembers.map(m => <MemberCard key={m.id} member={m} />)}
          </div>
        )}
      </div>
    </section>
  );
};

export const weddingPartyGridDefinition: SectionDefinition<WeddingPartyGridData> = {
  type: 'weddingParty',
  variant: 'grid',
  schema: weddingPartyGridSchema,
  defaultData: defaultWeddingPartyGridData,
  Component: WeddingPartyGrid,
};
