import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import type { GalleryContent } from '../../../types/siteConfig';

interface GallerySectionProps {
  content: GalleryContent;
}

export const GallerySection: React.FC<GallerySectionProps> = ({ content }) => {
  if (!content.photos || content.photos.length === 0) {
    return (
      <section className="py-16 px-8 bg-surface">
        <div className="max-w-4xl mx-auto text-center">
          <ImageIcon className="w-12 h-12 text-text-secondary mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-text-primary mb-6">
            Photo Gallery
          </h2>
          <p className="text-text-secondary italic">
            Photos coming soon
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-8 bg-surface">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-text-primary text-center mb-12">
          Photo Gallery
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {content.photos.map((photo) => (
            <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-surface-subtle">
              <img
                src={photo.url}
                alt={photo.caption || 'Wedding photo'}
                className="w-full h-full object-cover"
              />
              {photo.caption && (
                <p className="text-sm text-text-secondary mt-2">{photo.caption}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
