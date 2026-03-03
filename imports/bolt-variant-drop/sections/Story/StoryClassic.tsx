import { Section } from '../../types/layoutConfig';

interface StoryClassicProps {
  section: Section;
}

export default function StoryClassic({ section }: StoryClassicProps) {
  const meetingStory = section.bindings?.meetingStory || 'We met on a beautiful spring day...';
  const proposalStory = section.bindings?.proposalStory || 'The proposal was magical...';

  return (
    <section className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-5xl font-serif text-center mb-16 text-gray-800">Our Story</h2>
        <div className="space-y-12">
          <div className="text-center">
            <h3 className="text-2xl font-serif mb-4 text-rose-500">How We Met</h3>
            <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
              {meetingStory}
            </p>
          </div>
          <div className="w-24 h-px bg-gray-300 mx-auto" />
          <div className="text-center">
            <h3 className="text-2xl font-serif mb-4 text-rose-500">The Proposal</h3>
            <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
              {proposalStory}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
