import React from 'react';
import { Gift, ExternalLink } from 'lucide-react';
import type { RegistryContent } from '../../../types/siteConfig';
import { getSafePublicWebUrl } from '../../../sections/publicLinks';

interface RegistrySectionProps {
  content: RegistryContent;
}

export const RegistrySection: React.FC<RegistrySectionProps> = ({ content }) => {
  const safeLinks = (content.links ?? [])
    .map((link) => ({ ...link, url: getSafePublicWebUrl(link.url) }))
    .filter((link) => link.url);

  return (
    <section className="py-16 px-8 bg-background">
      <div className="max-w-4xl mx-auto text-center">
        <Gift className="w-12 h-12 text-accent mx-auto mb-6" />
        <h2 className="text-4xl font-bold text-text-primary mb-6">
          Registry
        </h2>

        {content.message && (
          <p className="text-text-secondary mb-8 max-w-2xl mx-auto">
            {content.message}
          </p>
        )}

        {safeLinks.length > 0 ? (
          <>
            <div className="mb-4 max-w-2xl mx-auto rounded-xl border border-border-subtle bg-surface-secondary/30 px-5 py-4 text-sm text-text-secondary">
              Registry availability may be updated over time as gifts are purchased or links are adjusted. If something looks unavailable, please check another option or come back later.
            </div>
            <div className="flex flex-col items-center gap-4">
              {safeLinks.map((link, index) => {
                return (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    {link.name}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          </>
        ) : (
          <div className="max-w-xl mx-auto rounded-xl border border-border-subtle bg-surface-secondary/40 px-6 py-5">
            <p className="text-text-primary font-medium">No registry linked right now</p>
            <p className="mt-2 text-sm text-text-secondary">Your presence is more than enough. If a registry is added later, it will appear here.</p>
          </div>
        )}
      </div>
    </section>
  );
};
