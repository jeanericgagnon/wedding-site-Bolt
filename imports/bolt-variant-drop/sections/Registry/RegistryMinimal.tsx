import { ExternalLink } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface RegistryMinimalProps {
  section: Section;
}

export default function RegistryMinimal({ section }: RegistryMinimalProps) {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-4xl font-serif mb-8 text-gray-900">Registry</h2>
        <p className="text-xl text-gray-600 mb-12 leading-relaxed">
          Your presence at our wedding is the greatest gift.
          If you wish to honor us with a gift, we are registered at the following locations.
        </p>

        <div className="space-y-4">
          <a href="#" className="flex items-center justify-between px-8 py-6 bg-white hover:bg-gray-50 transition-colors border border-gray-200">
            <span className="text-xl font-medium text-gray-900">Crate & Barrel</span>
            <ExternalLink className="w-5 h-5 text-gray-400" />
          </a>
          <a href="#" className="flex items-center justify-between px-8 py-6 bg-white hover:bg-gray-50 transition-colors border border-gray-200">
            <span className="text-xl font-medium text-gray-900">Zola</span>
            <ExternalLink className="w-5 h-5 text-gray-400" />
          </a>
          <a href="#" className="flex items-center justify-between px-8 py-6 bg-white hover:bg-gray-50 transition-colors border border-gray-200">
            <span className="text-xl font-medium text-gray-900">Honeymoon Fund</span>
            <ExternalLink className="w-5 h-5 text-gray-400" />
          </a>
        </div>
      </div>
    </section>
  );
}
