import { Section } from '../../types/layoutConfig';

interface StorySplitProps {
  section: Section;
}

export default function StorySplit({ section }: StorySplitProps) {
  const meetingStory = section.bindings?.meetingStory || 'We met on a beautiful spring day...';
  const proposalStory = section.bindings?.proposalStory || 'The proposal was magical...';

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-5xl font-serif text-center mb-20 text-gray-800">Our Love Story</h2>

        <div className="grid md:grid-cols-2 gap-0 mb-16">
          <div className="relative h-[500px] bg-[url('https://images.pexels.com/photos/1024967/pexels-photo-1024967.jpeg')] bg-cover bg-center" />
          <div className="bg-rose-50 p-12 flex items-center">
            <div>
              <h3 className="text-3xl font-serif mb-6 text-gray-800">Chapter One</h3>
              <p className="text-lg text-gray-700 leading-relaxed">{meetingStory}</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-0">
          <div className="bg-amber-50 p-12 flex items-center order-2 md:order-1">
            <div>
              <h3 className="text-3xl font-serif mb-6 text-gray-800">Chapter Two</h3>
              <p className="text-lg text-gray-700 leading-relaxed">{proposalStory}</p>
            </div>
          </div>
          <div className="relative h-[500px] bg-[url('https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg')] bg-cover bg-center order-1 md:order-2" />
        </div>
      </div>
    </section>
  );
}
