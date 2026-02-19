import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { Users } from 'lucide-react';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

interface PartyMember {
  name: string;
  role: string;
  photo?: string;
  note?: string;
}

function getPartyMembers(settings: SectionInstance['settings']): { bridal: PartyMember[]; groomsmen: PartyMember[] } {
  const bridal: PartyMember[] = settings.bridalParty
    ? (settings.bridalParty as PartyMember[])
    : [
        { name: 'Maid of Honor', role: 'Maid of Honor' },
        { name: 'Bridesmaid', role: 'Bridesmaid' },
        { name: 'Bridesmaid', role: 'Bridesmaid' },
      ];
  const groomsmen: PartyMember[] = settings.groomParty
    ? (settings.groomParty as PartyMember[])
    : [
        { name: 'Best Man', role: 'Best Man' },
        { name: 'Groomsman', role: 'Groomsman' },
        { name: 'Groomsman', role: 'Groomsman' },
      ];
  return { bridal, groomsmen };
}

const MemberCard: React.FC<{ member: PartyMember; accent?: boolean }> = ({ member, accent }) => (
  <div className="flex flex-col items-center text-center gap-3">
    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-xl font-light border-2 ${accent ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface-subtle text-text-tertiary'}`}>
      {member.photo ? (
        <img src={member.photo} alt={member.name} className="w-full h-full rounded-full object-cover" />
      ) : (
        member.name.charAt(0).toUpperCase()
      )}
    </div>
    <div>
      <p className="font-medium text-text-primary text-sm">{member.name}</p>
      <p className="text-xs text-primary mt-0.5">{member.role}</p>
      {member.note && <p className="text-xs text-text-secondary mt-1">{member.note}</p>}
    </div>
  </div>
);

export const WeddingPartySection: React.FC<Props> = ({ data, instance }) => {
  const { settings } = instance;
  const { bridal, groomsmen } = getPartyMembers(settings);
  const partner1 = data.couple.partner1Name || 'Partner 1';
  const partner2 = data.couple.partner2Name || 'Partner 2';

  return (
    <section className="py-20 px-4 bg-surface-subtle">
      <div className="max-w-5xl mx-auto">
        {settings.showTitle !== false && (
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3 font-medium">
              {settings.eyebrow || 'The crew'}
            </p>
            <h2 className="text-4xl font-light text-text-primary">
              {settings.title || 'Wedding Party'}
            </h2>
            {settings.subtitle && (
              <p className="mt-4 text-text-secondary max-w-xl mx-auto">{settings.subtitle}</p>
            )}
            <div className="w-10 h-px bg-primary mx-auto mt-6" />
          </div>
        )}

        <div className="space-y-14">
          <div>
            <h3 className="text-center text-xs uppercase tracking-[0.25em] font-medium text-text-tertiary mb-8">
              {settings.bridalTitle || `${partner1}'s Side`}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8 justify-items-center">
              {bridal.map((member, i) => (
                <MemberCard key={i} member={member} accent />
              ))}
            </div>
          </div>

          <div className="border-t border-border" />

          <div>
            <h3 className="text-center text-xs uppercase tracking-[0.25em] font-medium text-text-tertiary mb-8">
              {settings.groomTitle || `${partner2}'s Side`}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8 justify-items-center">
              {groomsmen.map((member, i) => (
                <MemberCard key={i} member={member} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const WeddingPartyGrid: React.FC<Props> = ({ data, instance }) => {
  const { settings } = instance;
  const { bridal, groomsmen } = getPartyMembers(settings);
  const all = [...bridal, ...groomsmen];

  return (
    <section className="py-20 px-4 bg-surface">
      <div className="max-w-5xl mx-auto">
        {settings.showTitle !== false && (
          <div className="text-center mb-14">
            <h2 className="text-4xl font-light text-text-primary">
              {settings.title || 'Wedding Party'}
            </h2>
            <div className="w-10 h-px bg-primary mx-auto mt-6" />
          </div>
        )}
        {all.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-text-tertiary">
            <Users className="w-8 h-8" />
            <p className="text-sm">Add your wedding party members in section settings</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8 justify-items-center">
            {all.map((member, i) => (
              <MemberCard key={i} member={member} accent={i < bridal.length} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
