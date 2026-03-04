import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { SectionRenderer } from '../builder/components/SectionRenderer';
import { BuilderSectionType, createDefaultSectionInstance } from '../types/builder/section';
import { createEmptyWeddingData } from '../types/weddingData';

const VALID_TYPES: BuilderSectionType[] = [
  'hero','story','venue','schedule','travel','registry','faq','rsvp','gallery','countdown','wedding-party','dress-code','accommodations','contact','footer-cta','custom','quotes','menu','music','directions','video'
];

export default function VariantPreviewCapture() {
  const [search] = useSearchParams();
  const sectionType = (search.get('sectionType') || 'hero') as BuilderSectionType;
  const variant = search.get('variant') || 'default';

  const safeType = VALID_TYPES.includes(sectionType) ? sectionType : 'hero';
  const section = React.useMemo(() => {
    const s = createDefaultSectionInstance(safeType, variant, 0);
    return { ...s, id: 'preview-section' };
  }, [safeType, variant]);

  const weddingData = React.useMemo(() => {
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Sam';
    data.couple.displayName = 'Alex & Sam';
    data.couple.story = 'From first look to final dance, this day is about the people we love most.';
    data.venues = [{ id: 'v1', name: 'Rosewood Estate', address: 'Napa Valley, CA' }];
    data.media.heroImageUrl = '/template-previews/romantic-dreamy.webp';
    data.media.gallery = [
      { id: 'g1', url: '/template-previews/romantic-dreamy.webp', caption: 'Golden hour' },
      { id: 'g2', url: '/template-previews/editorial-impact.webp', caption: 'Editorial portraits' },
      { id: 'g3', url: '/template-previews/timeless-classic.webp', caption: 'Ceremony details' },
    ];
    return data;
  }, []);

  return (
    <div style={{ width: 960, height: 540, overflow: 'hidden', background: '#fff' }}>
      <SectionRenderer section={section} weddingData={weddingData} isPreview siteSlug="preview" />
    </div>
  );
}
