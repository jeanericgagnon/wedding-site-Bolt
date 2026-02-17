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
      <section className="py-16 px-4 bg-surface-subtle">
        <div className="max-w-4xl mx-auto text-center">
          {settings.showTitle && (
            <h2 className="text-4xl font-bold text-text-primary mb-8">{settings.title || 'Photos'}</h2>
          )}
          <p className="text-text-secondary">Photo gallery coming soon</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-surface-subtle">
      <div className="max-w-6xl mx-auto">
        {settings.showTitle && (
          <h2 className="text-4xl font-bold text-text-primary text-center mb-12">{settings.title || 'Photos'}</h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {media.gallery.map(photo => (
            <div key={photo.id} className="aspect-square rounded-lg overflow-hidden">
              <img
                src={photo.url}
                alt={photo.caption || 'Gallery photo'}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
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
          <p className="text-text-secondary">Photo gallery coming soon</p>
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
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3 font-medium">Memories</p>
            <h2 className="text-4xl font-light text-text-primary">{settings.title || 'Photos'}</h2>
            <div className="w-10 h-px bg-primary mx-auto mt-6" />
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {cols.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-3">
              {col.map((photo, pi) => (
                <div
                  key={photo.id}
                  className={"overflow-hidden rounded-xl " + (pi % 3 === 0 ? "aspect-[4/5]" : pi % 3 === 1 ? "aspect-square" : "aspect-[3/4]")}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Gallery photo'}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
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
