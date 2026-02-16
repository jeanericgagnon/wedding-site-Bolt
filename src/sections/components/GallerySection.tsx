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
            <h2 className="text-4xl font-bold text-text-primary mb-8">
              {settings.title || 'Photos'}
            </h2>
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
          <h2 className="text-4xl font-bold text-text-primary text-center mb-12">
            {settings.title || 'Photos'}
          </h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {media.gallery.map(photo => (
            <div key={photo.id} className="aspect-square rounded-lg overflow-hidden">
              <img
                src={photo.url}
                alt={photo.caption || 'Gallery photo'}
                className="w-full h-full object-cover hover:scale-105 transition-transform"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
