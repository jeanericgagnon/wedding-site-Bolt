import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

export const GallerySection: React.FC<Props> = ({ data, instance }) => {
  const { media } = data;
  const { settings } = instance;

  if (media.gallery.length === 0) {
    return (
      <section className="py-16 md:py-20 px-4 bg-surface-subtle">
        <div className="max-w-4xl mx-auto text-center">
          {settings.showTitle && (
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-text-primary mb-6">{settings.title || 'Photos'}</h2>
          )}
          <p className="text-text-secondary">Your photo gallery will appear here once images are added</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-20 px-4 bg-surface-subtle">
      <div className="max-w-6xl mx-auto">
        {settings.showTitle && (
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-text-primary text-center mb-10 md:mb-12">{settings.title || 'Photos'}</h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {media.gallery.map(photo => (
            <div key={photo.id} className="group aspect-square rounded-xl overflow-hidden border border-border/60 shadow-sm">
              <img
                src={photo.url}
                alt={photo.caption || 'Gallery photo'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const GalleryMasonry: React.FC<Props> = ({ data, instance }) => {
  const { media } = data;
  const { settings } = instance;

  if (media.gallery.length === 0) {
    return (
      <section className="py-20 px-4 bg-background">
        <div className="max-w-4xl mx-auto text-center">
          {settings.showTitle && (
            <h2 className="text-4xl font-light text-text-primary mb-8">{settings.title || 'Photos'}</h2>
          )}
          <p className="text-text-secondary">Your photo gallery will appear here once images are added</p>
        </div>
      </section>
    );
  }

  const cols: typeof media.gallery[] = [[], [], []];
  media.gallery.forEach((photo, i) => cols[i % 3].push(photo));

  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        {settings.showTitle && (
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.32em] text-primary mb-3 font-medium">Memories</p>
            <h2 className="text-4xl font-light tracking-tight text-text-primary">{settings.title || 'Photos'}</h2>
            <div className="w-10 h-px bg-primary mx-auto mt-6" />
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {cols.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-3">
              {col.map((photo, pi) => (
                <div
                  key={photo.id}
                  className={"group overflow-hidden rounded-xl border border-border/50 shadow-sm " + (pi % 3 === 0 ? "aspect-[4/5]" : pi % 3 === 1 ? "aspect-square" : "aspect-[3/4]")}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Gallery photo'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
