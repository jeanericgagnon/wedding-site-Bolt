import { Heart, Sparkles, Users } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface StoryCardsProps {
  section: Section;
}

export default function StoryCards({ section }: StoryCardsProps) {
  const meetingStory = section.bindings?.meetingStory || 'We met on a beautiful spring day...';
  const proposalStory = section.bindings?.proposalStory || 'The proposal was magical...';
  const futureStory = section.bindings?.futureStory || 'We cannot wait to celebrate with you...';

  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-5xl font-serif text-center mb-20 text-gray-800">Our Journey</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-6">
              <Heart className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-2xl font-serif mb-4 text-gray-800">How We Met</h3>
            <p className="text-gray-600 leading-relaxed">{meetingStory}</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-2xl font-serif mb-4 text-gray-800">The Proposal</h3>
            <p className="text-gray-600 leading-relaxed">{proposalStory}</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-2xl font-serif mb-4 text-gray-800">Celebrating Together</h3>
            <p className="text-gray-600 leading-relaxed">{futureStory}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
