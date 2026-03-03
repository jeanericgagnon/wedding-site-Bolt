import { Section } from '../../types/layoutConfig';

interface CountdownClassicProps {
  section: Section;
}

export default function CountdownClassic({ section }: CountdownClassicProps) {
  return (
    <section className="py-24 bg-gradient-to-br from-rose-500 to-pink-500 text-white">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-4xl font-serif mb-12">Counting Down to Forever</h2>
        <div className="grid grid-cols-4 gap-8 max-w-3xl mx-auto">
          <div>
            <div className="text-6xl font-bold mb-2">120</div>
            <div className="text-lg opacity-90">Days</div>
          </div>
          <div>
            <div className="text-6xl font-bold mb-2">08</div>
            <div className="text-lg opacity-90">Hours</div>
          </div>
          <div>
            <div className="text-6xl font-bold mb-2">45</div>
            <div className="text-lg opacity-90">Minutes</div>
          </div>
          <div>
            <div className="text-6xl font-bold mb-2">23</div>
            <div className="text-lg opacity-90">Seconds</div>
          </div>
        </div>
      </div>
    </section>
  );
}
