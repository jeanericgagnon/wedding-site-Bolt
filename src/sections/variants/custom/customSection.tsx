import React, { useRef, useEffect, useState } from 'react';
import { z } from 'zod';
import { SectionDefinition, SectionComponentProps } from '../../types';
import { CustomBlock, CUSTOM_SKELETONS } from './skeletons';

const CustomBlockSchema: z.ZodType<CustomBlock> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.enum(['heading', 'subheading', 'paragraph', 'image', 'button', 'divider', 'spacer', 'columns', 'badge']),
    content: z.string().optional(),
    imageUrl: z.string().optional(),
    imageAlt: z.string().optional(),
    buttonLabel: z.string().optional(),
    buttonUrl: z.string().optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
    size: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
    columns: z.array(z.array(z.any())).optional(),
    variant: z.string().optional(),
  })
);

export const customSectionSchema = z.object({
  skeletonId: z.string().default('blank'),
  backgroundColor: z.string().default('#ffffff'),
  paddingSize: z.enum(['sm', 'md', 'lg']).default('md'),
  blocks: z.array(CustomBlockSchema).default([]),
});

export type CustomSectionData = z.infer<typeof customSectionSchema>;

const defaultSkeleton = CUSTOM_SKELETONS[0];

export const defaultCustomSectionData: CustomSectionData = {
  skeletonId: defaultSkeleton.id,
  backgroundColor: defaultSkeleton.backgroundColor,
  paddingSize: defaultSkeleton.paddingSize,
  blocks: defaultSkeleton.blocks,
};

const PADDING_CLASS = {
  sm: 'py-12 md:py-16',
  md: 'py-20 md:py-28',
  lg: 'py-28 md:py-36',
};

const ALIGN_CLASS = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const ALIGN_ITEMS_CLASS = {
  left: 'items-start',
  center: 'items-center',
  right: 'items-end',
};

function useScrollReveal(ref: React.RefObject<Element | null>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return visible;
}

const BlockRenderer: React.FC<{ block: CustomBlock; dark?: boolean }> = ({ block, dark }) => {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useScrollReveal(ref);
  const isLight = block.variant === 'light' || dark;

  const baseTransition = 'transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]';
  const revealClass = visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4';

  const align = block.align ?? 'left';
  const alignClass = ALIGN_CLASS[align];
  const alignItemsClass = ALIGN_ITEMS_CLASS[align];
  const justifyClass = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';

  switch (block.type) {
    case 'badge':
      return (
        <div ref={ref} className={`flex ${justifyClass} mb-4 ${baseTransition} ${revealClass}`}>
          <span className={`text-[11px] uppercase tracking-[0.2em] font-semibold px-3 py-1 rounded-full border ${
            isLight ? 'border-white/30 text-white/80' : 'border-stone-300 text-stone-500'
          }`}>
            {block.content}
          </span>
        </div>
      );

    case 'heading': {
      const sizeClass = {
        sm: 'text-2xl md:text-3xl',
        md: 'text-3xl md:text-4xl',
        lg: 'text-4xl md:text-5xl',
        xl: 'text-5xl md:text-6xl',
      }[block.size ?? 'lg'] ?? 'text-4xl md:text-5xl';
      return (
        <div ref={ref} className={`${baseTransition} ${revealClass}`}>
          <h2 className={`${sizeClass} font-light ${alignClass} mb-4 leading-tight ${isLight ? 'text-white' : 'text-stone-900'}`}>
            {block.content}
          </h2>
        </div>
      );
    }

    case 'subheading':
      return (
        <div ref={ref} className={`${baseTransition} ${revealClass}`}>
          <h3 className={`text-lg md:text-xl font-semibold ${alignClass} mb-2 ${isLight ? 'text-white' : 'text-stone-800'}`}>
            {block.content}
          </h3>
        </div>
      );

    case 'paragraph': {
      const sizeClass = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-xl' }[block.size ?? 'md'] ?? 'text-base';
      return (
        <div ref={ref} className={`${baseTransition} ${revealClass}`}>
          <p className={`${sizeClass} ${alignClass} font-light leading-relaxed ${isLight ? 'text-white/80' : 'text-stone-600'} whitespace-pre-line mb-3`}>
            {block.content}
          </p>
        </div>
      );
    }

    case 'image':
      return (
        <div ref={ref} className={`${baseTransition} ${revealClass} w-full`}>
          <img
            src={block.imageUrl}
            alt={block.imageAlt ?? ''}
            className="w-full rounded-2xl object-cover shadow-sm"
            style={{ maxHeight: '420px' }}
          />
        </div>
      );

    case 'button': {
      const isOutlineLight = block.variant === 'outline-light';
      const btnClass = isOutlineLight
        ? 'border-2 border-white text-white hover:bg-white hover:text-stone-900'
        : isLight
        ? 'bg-white text-stone-900 hover:bg-white/90'
        : 'bg-stone-900 text-white hover:bg-stone-800';
      return (
        <div ref={ref} className={`flex ${justifyClass} mt-2 ${baseTransition} ${revealClass}`}>
          <a
            href={block.buttonUrl || '#'}
            className={`inline-flex items-center px-7 py-3 rounded-full text-sm font-semibold tracking-wide transition-all ${btnClass}`}
          >
            {block.buttonLabel}
          </a>
        </div>
      );
    }

    case 'divider':
      return (
        <div ref={ref} className={`flex ${justifyClass} my-5 ${baseTransition} ${revealClass}`}>
          <div className={`w-12 h-px ${isLight ? 'bg-white/30' : 'bg-stone-300'}`} />
        </div>
      );

    case 'spacer':
      return <div className={{ sm: 'h-4', md: 'h-8', lg: 'h-16', xl: 'h-24' }[block.size ?? 'md'] ?? 'h-8'} />;

    case 'columns':
      return (
        <div ref={ref} className={`grid gap-8 ${(block.columns?.length ?? 2) === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'} ${baseTransition} ${revealClass}`}>
          {(block.columns ?? []).map((col, ci) => (
            <div key={ci} className={`flex flex-col ${alignItemsClass} gap-2`}>
              {col.map(subBlock => (
                <BlockRenderer key={subBlock.id} block={subBlock} dark={dark} />
              ))}
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
};

const CustomSection: React.FC<SectionComponentProps<CustomSectionData>> = ({ data }) => {
  const paddingClass = PADDING_CLASS[data.paddingSize] ?? PADDING_CLASS.md;
  const isDark = isDarkColor(data.backgroundColor);

  return (
    <section
      className={`${paddingClass}`}
      id="custom"
      style={{ backgroundColor: data.backgroundColor }}
    >
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        <div className="flex flex-col gap-1">
          {data.blocks.map(block => (
            <BlockRenderer key={block.id} block={block} dark={isDark} />
          ))}
        </div>
      </div>
    </section>
  );
};

function isDarkColor(hex: string): boolean {
  const cleaned = hex.replace('#', '');
  if (cleaned.length < 6) return false;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.4;
}

export const customSectionDefinition: SectionDefinition<CustomSectionData> = {
  type: 'custom',
  variant: 'default',
  schema: customSectionSchema,
  defaultData: defaultCustomSectionData,
  Component: CustomSection,
};
