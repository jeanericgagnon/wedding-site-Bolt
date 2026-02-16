import React from 'react';
import { Heart } from 'lucide-react';
import type { HeroContent } from '../../../types/siteConfig';

interface HeroSectionProps {
  content: HeroContent;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ content }) => {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/10 to-background p-8">
      <div className="text-center max-w-4xl">
        <Heart className="w-16 h-16 text-accent mx-auto mb-8" fill="currentColor" />
        <h1 className="text-5xl md:text-7xl font-bold text-text-primary mb-6">
          {content.headline}
        </h1>
        {content.subheadline && (
          <p className="text-xl md:text-2xl text-text-secondary">
            {content.subheadline}
          </p>
        )}
      </div>
    </section>
  );
};
