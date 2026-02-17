import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { ExternalLink, Gift } from 'lucide-react';

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
            <h2 className="text-4xl font-bold text-text-primary mb-8">{settings.title || 'Registry'}</h2>
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
          <h2 className="text-4xl font-bold text-text-primary text-center mb-8">{settings.title || 'Registry'}</h2>
        )}
        {registry.notes && <p className="text-text-secondary text-center mb-8">{registry.notes}</p>}
        <div className="grid md:grid-cols-2 gap-4">
          {linksToShow.map(link => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-surface-subtle rounded-lg hover:bg-primary/10 transition-colors"
            >
              <span className="font-medium text-text-primary">{link.label || link.url}</span>
              <ExternalLink className="w-5 h-5 text-primary" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export const RegistryGrid: React.FC<Props> = ({ data, instance }) => {
  const { registry } = data;
  const { settings, bindings } = instance;
  const linksToShow = bindings.linkIds && bindings.linkIds.length > 0
    ? registry.links.filter(l => bindings.linkIds!.includes(l.id))
    : registry.links;

  if (linksToShow.length === 0) {
    return (
      <section className="py-20 px-4 bg-surface-subtle">
        <div className="max-w-4xl mx-auto text-center">
          {settings.showTitle && (
            <h2 className="text-4xl font-light text-text-primary mb-8">{settings.title || 'Registry'}</h2>
          )}
          <p className="text-text-secondary">Registry links coming soon</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4 bg-surface-subtle">
      <div className="max-w-4xl mx-auto">
        {settings.showTitle && (
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3 font-medium">Gift registry</p>
            <h2 className="text-4xl font-light text-text-primary">{settings.title || 'Registry'}</h2>
            {registry.notes && <p className="text-text-secondary mt-4 max-w-xl mx-auto">{registry.notes}</p>}
            <div className="w-10 h-px bg-primary mx-auto mt-6" />
          </div>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {linksToShow.map(link => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center p-8 bg-surface rounded-2xl border border-border hover:border-primary/40 hover:shadow-md transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Gift className="w-6 h-6 text-primary" />
              </div>
              <span className="font-medium text-text-primary text-center mb-3">{link.label || link.url}</span>
              <span className="inline-flex items-center gap-1.5 text-sm text-primary font-medium">
                View registry
                <ExternalLink className="w-3.5 h-3.5" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
