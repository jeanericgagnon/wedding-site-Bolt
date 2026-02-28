import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import { ExternalLink, Gift, Heart, ShoppingBag } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';
import { useSiteView } from '../../../contexts/SiteViewContext';
import { publicFetchRegistryItems } from '../../../pages/dashboard/registry/registryService';
import { RegistryItem } from '../../../pages/dashboard/registry/registryTypes';

const FeaturedGiftSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  store: z.string().default(''),
  price: z.string().default(''),
  description: z.string().default(''),
  image: z.string().default(''),
  url: z.string().default(''),
  category: z.string().default(''),
  isPriority: z.boolean().default(false),
  isClaimed: z.boolean().default(false),
});

const RegistryStoreLinkSchema = z.object({
  id: z.string(),
  store: z.string().default(''),
  url: z.string().default(''),
  description: z.string().default(''),
});

export const registryFeaturedSchema = z.object({
  eyebrow: z.string().default('Gift registry'),
  headline: z.string().default('Registry'),
  message: z.string().default(''),
  featuredGifts: z.array(FeaturedGiftSchema).default([]),
  storeLinks: z.array(RegistryStoreLinkSchema).default([]),
  cashFundEnabled: z.boolean().default(false),
  cashFundLabel: z.string().default('Honeymoon Fund'),
  cashFundUrl: z.string().default(''),
  cashFundDescription: z.string().default(''),
  showAllLabel: z.string().default('View Full Registry'),
  viewAllUrl: z.string().default(''),
  layout: z.enum(['2col', '3col', 'hero']).default('2col'),
});

export type RegistryFeaturedData = z.infer<typeof registryFeaturedSchema>;

export const defaultRegistryFeaturedData: RegistryFeaturedData = {
  eyebrow: 'Gift registry',
  headline: 'Registry',
  message: 'Your presence is the greatest gift. For those who wish to celebrate us with something special, a few favorites are listed below.',
  layout: '2col',
  showAllLabel: 'View Full Registry',
  viewAllUrl: '#',
  cashFundEnabled: true,
  cashFundLabel: 'Honeymoon Fund',
  cashFundUrl: '#',
  cashFundDescription: 'Help us create memories on our honeymoon through Italy.',
  storeLinks: [
    { id: '1', store: 'Crate & Barrel', url: '#', description: '' },
    { id: '2', store: 'Williams Sonoma', url: '#', description: '' },
  ],
  featuredGifts: [
    {
      id: '1',
      name: 'Le Creuset Dutch Oven',
      store: 'Williams Sonoma',
      price: '$400',
      description: 'The 5.5 qt in Cerise — perfect for Sunday soups',
      image: 'https://images.pexels.com/photos/4226805/pexels-photo-4226805.jpeg?auto=compress&cs=tinysrgb&w=600',
      url: '#',
      category: 'Kitchen',
      isPriority: true,
      isClaimed: false,
    },
    {
      id: '2',
      name: 'KitchenAid Stand Mixer',
      store: 'Williams Sonoma',
      price: '$500',
      description: 'In Matte Black — for weekend baking projects',
      image: 'https://images.pexels.com/photos/4224218/pexels-photo-4224218.jpeg?auto=compress&cs=tinysrgb&w=600',
      url: '#',
      category: 'Kitchen',
      isPriority: false,
      isClaimed: false,
    },
    {
      id: '3',
      name: 'Parachute Duvet Set',
      store: 'Crate & Barrel',
      price: '$350',
      description: 'Queen size in White — cloud-soft cotton percale',
      image: 'https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=600',
      url: '#',
      category: 'Bedroom',
      isPriority: true,
      isClaimed: false,
    },
    {
      id: '4',
      name: 'Staub Cast Iron Skillet',
      store: 'Williams Sonoma',
      price: '$180',
      description: '12-inch in Graphite — a kitchen workhorse',
      image: 'https://images.pexels.com/photos/6205791/pexels-photo-6205791.jpeg?auto=compress&cs=tinysrgb&w=600',
      url: '#',
      category: 'Kitchen',
      isPriority: false,
      isClaimed: true,
    },
  ],
};

const GiftCard: React.FC<{ gift: z.infer<typeof FeaturedGiftSchema>; compact?: boolean }> = ({ gift, compact }) => (
  <a
    href={gift.isClaimed ? undefined : (gift.url || '#')}
    target={gift.url && !gift.isClaimed ? '_blank' : undefined}
    rel="noopener noreferrer"
    className={`group flex flex-col bg-white rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-0.5 ${
      gift.isClaimed
        ? 'border-stone-100 opacity-60 cursor-default'
        : gift.isPriority
        ? 'border-rose-100 hover:border-rose-200 hover:shadow-md shadow-sm'
        : 'border-stone-100 hover:border-stone-200 hover:shadow-sm'
    }`}
  >
    {gift.image && (
      <div className={`overflow-hidden bg-stone-100 ${compact ? 'aspect-[4/3]' : 'aspect-square'}`}>
        <img
          src={gift.image}
          alt={gift.name}
          className={`w-full h-full object-cover saturate-[1.03] contrast-[1.02] transition-transform duration-500 ${gift.isClaimed ? '' : 'group-hover:scale-105'}`}
        />
      </div>
    )}
    <div className="p-4 flex flex-col flex-1">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          {gift.category && (
            <p className="text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-1">{gift.category}</p>
          )}
          <h3 className="font-semibold text-stone-900 text-sm leading-tight">{gift.name}</h3>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {gift.isClaimed && (
            <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-600 border border-green-100 rounded-full font-medium uppercase tracking-wide">
              Claimed
            </span>
          )}
          {gift.isPriority && !gift.isClaimed && (
            <Heart size={12} className="text-rose-400 fill-rose-400" />
          )}
        </div>
      </div>
      <p className="text-xs text-stone-400 mt-0.5">{gift.store}</p>
      {gift.description && (
        <p className="text-xs text-stone-500 font-light mt-1.5 leading-relaxed line-clamp-2">{gift.description}</p>
      )}
      <div className="mt-auto pt-3 flex items-center justify-between">
        {gift.price && (
          <span className="text-sm font-semibold text-stone-800">{gift.price}</span>
        )}
        {!gift.isClaimed && gift.url && (
          <span className="text-[10px] text-stone-400 group-hover:text-stone-700 transition-colors uppercase tracking-wide font-medium flex items-center gap-1">
            <ShoppingBag size={10} />
            Gift this
          </span>
        )}
      </div>
    </div>
  </a>
);

function registryItemToGift(item: RegistryItem): z.infer<typeof FeaturedGiftSchema> {
  return {
    id: item.id,
    name: item.item_name,
    store: item.store_name ?? item.merchant ?? '',
    price: item.price_label ?? (item.price_amount != null ? `$${item.price_amount}` : ''),
    description: item.description ?? item.notes ?? '',
    image: item.image_url ?? '',
    url: item.item_url ?? item.canonical_url ?? '',
    category: '',
    isPriority: item.priority === 'high',
    isClaimed: item.purchase_status === 'purchased',
  };
}

const RegistryFeatured: React.FC<SectionComponentProps<RegistryFeaturedData>> = ({ data }) => {
  const { weddingSiteId } = useSiteView();
  const [liveItems, setLiveItems] = useState<RegistryItem[] | null>(null);

  useEffect(() => {
    if (!weddingSiteId) return;
    publicFetchRegistryItems(weddingSiteId)
      .then(items => setLiveItems(items.filter(i => !i.hide_when_purchased || i.purchase_status !== 'purchased')))
      .catch(() => setLiveItems(null));
  }, [weddingSiteId]);

  const displayGifts = liveItems
    ? liveItems.map(registryItemToGift)
    : data.featuredGifts;

  const colClass = data.layout === '3col'
    ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
    : 'grid-cols-1 sm:grid-cols-2';

  const hasStoreLinks = data.storeLinks.length > 0;

  const heroGift = data.layout === 'hero' && displayGifts[0];
  const restGifts = data.layout === 'hero' ? displayGifts.slice(1) : displayGifts;

  return (
    <section className="py-32 md:py-40 bg-gradient-to-b from-white to-stone-50/35" id="registry">
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        <div className="text-center mb-12">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">
              {data.eyebrow}
            </p>
          )}
          <h2 className="text-4xl md:text-6xl font-light text-stone-900 mb-4 tracking-tight">{data.headline}</h2>
          {data.message && (
            <p className="text-stone-500 text-base font-light leading-relaxed max-w-2xl mx-auto">{data.message}</p>
          )}
        </div>

        {displayGifts.length > 0 && (
          <div className="mb-10">
            {heroGift && (
              <div className="mb-6">
                <a
                  href={heroGift.isClaimed ? undefined : (heroGift.url || '#')}
                  target={heroGift.url && !heroGift.isClaimed ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className="group grid grid-cols-1 md:grid-cols-2 gap-0 bg-white rounded-[1.7rem] overflow-hidden border border-rose-100 shadow-sm hover:shadow-xl transition-shadow"
                >
                  {heroGift.image && (
                    <div className="aspect-[4/3] md:aspect-auto overflow-hidden bg-stone-100">
                      <img src={heroGift.image} alt={heroGift.name} className="w-full h-full object-cover saturate-[1.03] contrast-[1.02] group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3">
                      <Heart size={14} className="text-rose-400 fill-rose-400" />
                      <span className="text-xs text-rose-500 font-medium uppercase tracking-wide">Top Pick</span>
                    </div>
                    {heroGift.category && <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">{heroGift.category}</p>}
                    <h3 className="text-xl font-semibold text-stone-900 mb-1">{heroGift.name}</h3>
                    <p className="text-sm text-stone-400 mb-3">{heroGift.store}</p>
                    {heroGift.description && <p className="text-sm text-stone-500 font-light leading-relaxed mb-4">{heroGift.description}</p>}
                    <div className="flex items-center justify-between">
                      {heroGift.price && <span className="text-lg font-bold text-stone-900">{heroGift.price}</span>}
                      {!heroGift.isClaimed && <span className="text-xs text-stone-400 group-hover:text-stone-700 transition-colors flex items-center gap-1.5 uppercase tracking-wide font-medium"><ExternalLink size={12} />View gift</span>}
                    </div>
                  </div>
                </a>
              </div>
            )}

            {restGifts.length > 0 && (
              <div className={`grid ${colClass} gap-5`}>
                {restGifts.map(gift => (
                  <GiftCard key={gift.id} gift={gift} compact={data.layout === '3col'} />
                ))}
              </div>
            )}
          </div>
        )}

        {hasStoreLinks && (
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-5">
              <div className="flex items-center gap-2">
                <Gift size={14} className="text-stone-400" />
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Browse the full registry</p>
              </div>
              <div className="flex-1 h-px bg-stone-100" />
            </div>
            <div className="flex flex-wrap gap-3">
              {data.storeLinks.map(link => (
                <a
                  key={link.id}
                  href={link.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 px-5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-700 hover:bg-white hover:border-stone-400 hover:shadow-sm transition-all"
                >
                  <ShoppingBag size={14} className="text-stone-400 group-hover:text-stone-600 transition-colors" />
                  {link.store}
                  <ExternalLink size={11} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
                </a>
              ))}
              {data.viewAllUrl && data.showAllLabel && (
                <a
                  href={data.viewAllUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors"
                >
                  {data.showAllLabel}
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
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
              <p className="font-semibold text-rose-900 text-base">{data.cashFundLabel}</p>
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

export const registryFeaturedDefinition: SectionDefinition<RegistryFeaturedData> = {
  type: 'registry',
  variant: 'featured',
  schema: registryFeaturedSchema,
  defaultData: defaultRegistryFeaturedData,
  Component: RegistryFeatured,
};
