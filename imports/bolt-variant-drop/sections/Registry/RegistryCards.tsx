import { Gift, Heart, Plane } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface RegistryCardsProps {
  section: Section;
}

export default function RegistryCards({ section }: RegistryCardsProps) {
  return (
    <section className="py-24 bg-gradient-to-b from-rose-50 to-white">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-5xl font-serif text-center mb-8 text-gray-800">Gift Registry</h2>
        <p className="text-center text-xl text-gray-600 mb-16 max-w-2xl mx-auto">
          Your presence is the greatest gift, but if you wish to honor us with a gift,
          we have registered at the following
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Gift className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-2xl font-serif mb-4 text-gray-800">Home Registry</h3>
            <p className="text-gray-600 mb-6">Help us build our home together</p>
            <button className="px-6 py-3 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors">
              View Registry
            </button>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg text-center hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Plane className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-2xl font-serif mb-4 text-gray-800">Honeymoon Fund</h3>
            <p className="text-gray-600 mb-6">Contribute to our dream adventure</p>
            <button className="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
              Contribute
            </button>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg text-center hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-2xl font-serif mb-4 text-gray-800">Charitable Donations</h3>
            <p className="text-gray-600 mb-6">Give to a cause close to our hearts</p>
            <button className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              Learn More
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
