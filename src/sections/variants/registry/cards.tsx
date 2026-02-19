import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import { ExternalLink, Gift, ShoppingBag } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';
import { useSiteView } from '../../../contexts/SiteViewContext';
import { publicFetchRegistryItems } from '../../../pages/dashboard/registry/registryService';
import { RegistryItem } from '../../../pages/dashboard/registry/registryTypes';

const RegistryLinkSchema = z.object({
  id: z.string(),
  store: z.string().default(''),
  url: z.string().default(''),
  description: z.string().default(''),
  logo: z.string().default(''),
});

export const registryCardsSchema = z.object({
  eyebrow: z.string().default('Gift registry'),
  headline: z.string().default('Registry'),
  message: z.string().default(''),
  links: z.array(RegistryLinkSchema).default([]),
  cashFundEnabled: z.boolean().default(false),
  cashFundLabel: z.string().default('Honeymoon Fund'),
  cashFundUrl: z.string().default(''),
  cashFundDescription: z.string().default(''),
});

export type RegistryCardsData = z.infer<typeof registryCardsSchema>;

export const defaultRegistryCardsData: RegistryCardsData = {
  eyebrow: 'Gift registry',
  headline: 'Registry',
  message: 'Your presence at our wedding is the greatest gift of all. For those who wish to honor us with a gift, we have registered at the following:',
  links: [
    { id: '1', store: 'Crate & Barrel', url: '#', description: 'Kitchen, home, and entertaining essentials', logo: '' },
    { id: '2', store: 'Williams Sonoma', url: '#', description: 'Cookware and kitchen appliances', logo: '' },
    { id: '3', store: 'Pottery Barn', url: '#', description: 'Bedding, décor, and furniture', logo: '' },
  ],
  cashFundEnabled: true,
  cashFundLabel: 'Honeymoon Fund',
  cashFundUrl: '#',
  cashFundDescription: 'Help us create lifelong memories on our honeymoon to Italy.',
};

function groupByStore(items: RegistryItem[]): Array<{ store: string; count: number; available: number; url: string | null }> {
  const map = new Map<string, { count: number; available: number; url: string | null }>();
  for (const item of items) {
    const store = item.store_name ?? item.merchant ?? 'Other';
    const existing = map.get(store) ?? { count: 0, available: 0, url: item.item_url };
    map.set(store, {
      count: existing.count + 1,
      available: existing.available + (item.purchase_status === 'available' ? 1 : 0),
      url: existing.url ?? item.item_url,
    });
  }
  return Array.from(map.entries()).map(([store, v]) => ({ store, ...v }));
}

const RegistryCards: React.FC<SectionComponentProps<RegistryCardsData>> = ({ data }) => {
  const { weddingSiteId } = useSiteView();
  const [liveItems, setLiveItems] = useState<RegistryItem[] | null>(null);

  useEffect(() => {
    if (!weddingSiteId) return;
    publicFetchRegistryItems(weddingSiteId)
      .then(items => setLiveItems(items.filter(i => !i.hide_when_purchased || i.purchase_status !== 'purchased')))
      .catch(() => setLiveItems(null));
  }, [weddingSiteId]);

  const storeGroups = liveItems ? groupByStore(liveItems) : null;

  return (
    <section className="py-24 md:py-32 bg-white" id="registry">
      <div className="max-w-4xl mx-auto px-6 md:px-12">
        <div className="text-center mb-12">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">{data.eyebrow}</p>
          )}
          <h2 className="text-4xl md:text-5xl font-light text-stone-900 mb-4">{data.headline}</h2>
          {data.message && (
            <p className="text-stone-500 text-base font-light leading-relaxed max-w-2xl mx-auto">{data.message}</p>
          )}
        </div>

        {storeGroups && storeGroups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {storeGroups.map(group => (
              <a
                key={group.store}
                href={group.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col p-6 bg-stone-50 border border-stone-100 rounded-2xl hover:border-stone-300 hover:bg-white hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center shadow-sm group-hover:shadow transition-shadow">
                    <ShoppingBag size={18} className="text-stone-400" />
                  </div>
                  <ExternalLink size={14} className="text-stone-300 group-hover:text-stone-500 transition-colors mt-1" />
                </div>
                <h3 className="font-medium text-stone-900 text-base mb-1.5">{group.store}</h3>
                <p className="text-sm text-stone-400 leading-relaxed">
                  {group.count} {group.count === 1 ? 'item' : 'items'}
                  {group.available < group.count ? ` · ${group.count - group.available} claimed` : ''}
                </p>
                <div className="mt-auto pt-4">
                  <span className="text-xs text-stone-400 group-hover:text-stone-600 transition-colors uppercase tracking-wide font-medium">
                    View registry →
                  </span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {data.links.map(link => (
              <a
                key={link.id}
                href={link.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col p-6 bg-stone-50 border border-stone-100 rounded-2xl hover:border-stone-300 hover:bg-white hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center shadow-sm group-hover:shadow transition-shadow">
                    <Gift size={18} className="text-stone-400" />
                  </div>
                  <ExternalLink size={14} className="text-stone-300 group-hover:text-stone-500 transition-colors mt-1" />
                </div>
                <h3 className="font-medium text-stone-900 text-base mb-1.5">{link.store}</h3>
                {link.description && (
                  <p className="text-sm text-stone-400 leading-relaxed">{link.description}</p>
                )}
                <div className="mt-auto pt-4">
                  <span className="text-xs text-stone-400 group-hover:text-stone-600 transition-colors uppercase tracking-wide font-medium">
                    View registry →
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}

        {data.cashFundEnabled && data.cashFundUrl && (
          <a
            href={data.cashFundUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between p-6 bg-rose-50 border border-rose-100 rounded-2xl hover:bg-rose-100 hover:border-rose-200 transition-all"
          >
            <div className="min-w-0">
              <p className="font-medium text-rose-900 text-base">{data.cashFundLabel}</p>
              {data.cashFundDescription && (
                <p className="text-sm text-rose-600 font-light mt-0.5 leading-relaxed">{data.cashFundDescription}</p>
              )}
            </div>
            <ExternalLink size={16} className="text-rose-400 group-hover:text-rose-600 flex-shrink-0 ml-4 transition-colors" />
          </a>
        )}
      </div>
    </section>
  );
};

export const registryCardsDefinition: SectionDefinition<RegistryCardsData> = {
  type: 'registry',
  variant: 'cards',
  schema: registryCardsSchema,
  defaultData: defaultRegistryCardsData,
  Component: RegistryCards,
};
