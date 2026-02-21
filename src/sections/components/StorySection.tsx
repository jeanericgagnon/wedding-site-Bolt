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
  const story = (settings.storyText as string) || couple.story || 'Our story is still being written...';
  const photoUrl = (settings.photo as string) || '';

  return (
    <section className="py-16 px-4 bg-surface">
      <div className="max-w-3xl mx-auto">
        {settings.showTitle !== false && (
          <h2 className="text-4xl font-bold text-text-primary text-center mb-8">
            {(settings.title as string) || 'Our Story'}
          </h2>
        )}
        {photoUrl && (
          <div className="aspect-video rounded-xl overflow-hidden mb-8">
            <img src={photoUrl} alt="Couple" className="w-full h-full object-cover" />
          </div>
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
  const story = (settings.storyText as string) || couple.story || 'Our story is still being written...';
  const photoUrl = (settings.photo as string) || '';

  return (
    <section className="py-20 px-4 bg-surface">
      <div className="max-w-2xl mx-auto text-center">
        {settings.showTitle !== false && (
          <>
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-4 font-medium">
              How it began
            </p>
            <h2 className="text-4xl md:text-5xl font-light text-text-primary mb-10">
              {(settings.title as string) || 'Our Story'}
            </h2>
            <div className="w-12 h-px bg-primary mx-auto mb-10" />
          </>
        )}
        {photoUrl && (
          <div className="w-48 h-48 rounded-full overflow-hidden mx-auto mb-8">
            <img src={photoUrl} alt="Couple" className="w-full h-full object-cover" />
          </div>
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
  const story = (settings.storyText as string) || couple.story || 'Our story is still being written...';
  const photoUrl = (settings.photo as string) || media.heroImageUrl || '';

  return (
    <section className="py-20 bg-surface">
      <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
        <div className="aspect-[4/5] rounded-xl overflow-hidden bg-surface-subtle">
          {photoUrl ? (
            <img src={photoUrl} alt="Couple" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-secondary">
              <span className="text-sm">Photo coming soon</span>
            </div>
          )}
        </div>
        <div>
          {settings.showTitle !== false && (
            <>
              <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3 font-medium">About us</p>
              <h2 className="text-3xl md:text-4xl font-light text-text-primary mb-8">
                {(settings.title as string) || 'Our Story'}
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

export const StoryTimeline: React.FC<Props> = ({ data, instance }) => {
  const { couple } = data;
  const { settings } = instance;
  const story = (settings.storyText as string) || couple.story || 'Our story is still being written...';
  const baseLines = story
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);

  const timeline = baseLines.length > 0
    ? baseLines.map((line, idx) => ({
        year: ['First Hello', 'First Date', 'Engagement', 'Forever'][idx] ?? `Moment ${idx + 1}`,
        detail: line,
      }))
    : [
        { year: 'First Hello', detail: 'We met and instantly felt at home with each other.' },
        { year: 'First Date', detail: 'A simple date turned into hours of conversation.' },
        { year: 'Engagement', detail: 'One beautiful question changed everything.' },
        { year: 'Forever', detail: 'Now we are counting down to celebrate with everyone we love.' },
      ];

  return (
    <section className="py-20 bg-surface">
      <div className="max-w-4xl mx-auto px-4">
        {settings.showTitle !== false && (
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.25em] text-primary mb-3 font-medium">The journey</p>
            <h2 className="text-3xl md:text-4xl font-light text-text-primary">{(settings.title as string) || 'Our Story'}</h2>
          </div>
        )}

        <div className="space-y-6">
          {timeline.map((item, idx) => (
            <div key={`${item.year}-${idx}`} className="grid grid-cols-[120px_1fr] gap-4 md:gap-8 items-start">
              <p className="text-xs md:text-sm uppercase tracking-[0.18em] text-primary font-semibold pt-1">{item.year}</p>
              <div className="relative pl-6 pb-6 border-l border-border-subtle last:pb-0">
                <span className="absolute -left-[6px] top-1 h-3 w-3 rounded-full bg-primary" />
                <p className="text-text-secondary leading-relaxed">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
