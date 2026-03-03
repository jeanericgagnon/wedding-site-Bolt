import { Section } from '../../types/layoutConfig';

interface FooterMinimalProps {
  section: Section;
}

export default function FooterMinimal({ section }: FooterMinimalProps) {
  return (
    <footer className="py-12 bg-white border-t border-gray-200">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <p className="text-gray-600">With love and gratitude</p>
      </div>
    </footer>
  );
}
