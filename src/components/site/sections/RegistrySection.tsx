import React from 'react';
import { Gift, ExternalLink } from 'lucide-react';
import type { RegistryContent } from '../../../types/siteConfig';

interface RegistrySectionProps {
  content: RegistryContent;
}

export const RegistrySection: React.FC<RegistrySectionProps> = ({ content }) => {
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

        {content.links && content.links.length > 0 ? (
          <div className="flex flex-col items-center gap-4">
            {content.links.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                {link.name}
                <ExternalLink className="w-4 h-4" />
              </a>
            ))}
          </div>
        ) : (
          <p className="text-text-secondary italic">
            Registry details coming soon
          </p>
        )}
      </div>
    </section>
  );
};
