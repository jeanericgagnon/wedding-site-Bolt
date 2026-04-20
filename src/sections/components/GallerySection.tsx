import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { readBuilderValue } from '../../lib/weddingProfile';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

interface GalleryPhoto {
  id: string;
  url: string;
  caption: string;
  alt: string;
}

function normalizeGalleryPhotos(data: WeddingDataV1, settings: SectionInstance['settings']): GalleryPhoto[] {
  const rawSettingImages = Array.isArray(settings.images) ? settings.images : [];
  const settingPhotos = rawSettingImages
    .map((item, index) => {
      if (typeof item === 'string') {
        const url = item.trim();
        return url ? { id: `settings-${index}`, url, caption: '', alt: '' } : null;
      }

      if (!item || typeof item !== 'object') return null;

      const record = item as Record<string, unknown>;
      const url = typeof record.url === 'string' ? record.url.trim() : '';
      if (!url) return null;

      return {
        id: typeof record.id === 'string' && record.id ? record.id : `settings-${index}`,
        url,
        caption: typeof record.caption === 'string' ? record.caption : '',
        alt: typeof record.alt === 'string' ? record.alt : '',
      };
    })
    .filter((photo): photo is GalleryPhoto => Boolean(photo));

  if (settingPhotos.length > 0) return settingPhotos;

  return data.media.gallery
    .filter((photo) => Boolean(photo.url?.trim()))
    .map((photo, index) => ({
      id: photo.id || `media-${index}`,
      url: photo.url,
      caption: photo.caption || '',
      alt: photo.caption || '',
    }));
}

export const GallerySection: React.FC<Props> = ({ data, instance }) => {
  const { settings } = instance;
  const photos = normalizeGalleryPhotos(data, settings);

  if (photos.length === 0) {
    return (
      <section className="py-16 md:py-20 px-4 bg-surface-subtle">
        <div className="max-w-4xl mx-auto text-center">
          {settings.showTitle && (
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-text-primary mb-6">{readBuilderValue(settings.title as string | { value: string } | undefined, 'Photos')}</h2>
          )}
          <p className="text-text-secondary">Photos will appear here once they’re added.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-20 px-4 bg-surface-subtle">
      <div className="max-w-6xl mx-auto">
        {settings.showTitle && (
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-text-primary text-center mb-10 md:mb-12">{readBuilderValue(settings.title as string | { value: string } | undefined, 'Photos')}</h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {photos.map(photo => (
            <div key={photo.id} className="group aspect-square rounded-xl overflow-hidden border border-border/60 shadow-sm">
              <img
                src={photo.url}
                alt={photo.alt || photo.caption || 'Gallery photo'}
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
  const { settings } = instance;
  const photos = normalizeGalleryPhotos(data, settings);

  if (photos.length === 0) {
    return (
      <section className="py-16 md:py-20 px-4 bg-background">
        <div className="max-w-4xl mx-auto text-center">
          {settings.showTitle && (
            <h2 className="text-3xl md:text-4xl font-light text-text-primary mb-8 leading-tight">{readBuilderValue(settings.title as string | { value: string } | undefined, 'Photos')}</h2>
          )}
          <p className="text-text-secondary">Photos will appear here once they’re added.</p>
        </div>
      </section>
    );
  }

  const cols: GalleryPhoto[][] = [[], [], []];
  photos.forEach((photo, i) => cols[i % 3].push(photo));

  return (
    <section className="py-16 md:py-20 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        {settings.showTitle && (
          <div className="text-center mb-10 md:mb-14">
            <p className="text-xs uppercase tracking-[0.32em] text-primary mb-3 font-medium">Memories</p>
            <h2 className="text-3xl md:text-4xl font-light tracking-tight text-text-primary leading-tight">{readBuilderValue(settings.title as string | { value: string } | undefined, 'Photos')}</h2>
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
                    alt={photo.alt || photo.caption || 'Gallery photo'}
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
