import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

export const StorySection: React.FC<Props> = ({ data, instance }) => {
  const { couple } = data;
  const { settings } = instance;
  
  const story = couple.story || 'Our story is still being written...';

  return (
    <section className="py-16 px-4 bg-surface">
      <div className="max-w-3xl mx-auto">
        {settings.showTitle && (
          <h2 className="text-4xl font-bold text-text-primary text-center mb-8">
            {settings.title || 'Our Story'}
          </h2>
        )}
        <div className="prose prose-lg mx-auto text-text-secondary whitespace-pre-wrap">
          {story}
        </div>
      </div>
    </section>
  );
};
