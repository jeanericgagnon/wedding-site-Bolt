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

export const StoryCentered: React.FC<Props> = ({ data, instance }) => {
  const { couple } = data;
  const { settings } = instance;
  const story = couple.story || 'Our story is still being written...';

  return (
    <section className="py-20 px-4 bg-surface">
      <div className="max-w-2xl mx-auto text-center">
        {settings.showTitle && (
          <>
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-4 font-medium">
              How it began
            </p>
            <h2 className="text-4xl md:text-5xl font-light text-text-primary mb-10">
              {settings.title || 'Our Story'}
            </h2>
            <div className="w-12 h-px bg-primary mx-auto mb-10" />
          </>
        )}
        <p className="text-lg text-text-secondary leading-relaxed whitespace-pre-wrap">
          {story}
        </p>
      </div>
    </section>
  );
};

export const StorySplit: React.FC<Props> = ({ data, instance }) => {
  const { couple, media } = data;
  const { settings } = instance;
  const story = couple.story || 'Our story is still being written...';

  return (
    <section className="py-20 bg-surface">
      <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
        <div className="aspect-[4/5] rounded-xl overflow-hidden bg-surface-subtle">
          {media.heroImageUrl ? (
            <img src={media.heroImageUrl} alt="Couple" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-secondary">
              <span className="text-sm">Photo coming soon</span>
            </div>
          )}
        </div>
        <div>
          {settings.showTitle && (
            <>
              <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3 font-medium">About us</p>
              <h2 className="text-3xl md:text-4xl font-light text-text-primary mb-8">
                {settings.title || 'Our Story'}
              </h2>
              <div className="w-10 h-px bg-primary mb-8" />
            </>
          )}
          <p className="text-text-secondary leading-relaxed whitespace-pre-wrap">{story}</p>
        </div>
      </div>
    </section>
  );
};
