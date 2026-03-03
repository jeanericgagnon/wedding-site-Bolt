import { Gift } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface RegistryClassicProps {
  section: Section;
}

export default function RegistryClassic({ section }: RegistryClassicProps) {
  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <Gift className="w-16 h-16 mx-auto mb-8 text-rose-400" />
        <h2 className="text-5xl font-serif mb-8 text-gray-800">Registry</h2>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Your presence is the greatest gift, but if you wish to honor us with a gift, we've registered at the following stores.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <button className="px-8 py-3 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors">
            View Registry
          </button>
        </div>
      </div>
    </section>
  );
}
