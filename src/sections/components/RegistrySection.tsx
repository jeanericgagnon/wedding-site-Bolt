import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { ExternalLink } from 'lucide-react';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

export const RegistrySection: React.FC<Props> = ({ data, instance }) => {
  const { registry } = data;
  const { settings, bindings } = instance;
  
  const linksToShow = bindings.linkIds && bindings.linkIds.length > 0
    ? registry.links.filter(l => bindings.linkIds!.includes(l.id))
    : registry.links;

  if (linksToShow.length === 0) {
    return (
      <section className="py-16 px-4 bg-surface">
        <div className="max-w-4xl mx-auto text-center">
          {settings.showTitle && (
            <h2 className="text-4xl font-bold text-text-primary mb-8">
              {settings.title || 'Registry'}
            </h2>
          )}
          <p className="text-text-secondary">Registry links coming soon</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-surface">
      <div className="max-w-4xl mx-auto">
        {settings.showTitle && (
          <h2 className="text-4xl font-bold text-text-primary text-center mb-8">
            {settings.title || 'Registry'}
          </h2>
        )}
        {registry.notes && (
          <p className="text-text-secondary text-center mb-8">{registry.notes}</p>
        )}
        <div className="grid md:grid-cols-2 gap-4">
          {linksToShow.map(link => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-surface-subtle rounded-lg hover:bg-primary/10 transition-colors"
            >
              <span className="font-medium text-text-primary">
                {link.label || link.url}
              </span>
              <ExternalLink className="w-5 h-5 text-primary" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
