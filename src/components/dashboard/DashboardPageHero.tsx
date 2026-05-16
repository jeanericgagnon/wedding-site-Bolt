import React from 'react';

interface DashboardPageHeroStat {
  label: string;
  value: React.ReactNode;
  detail?: string;
}

interface DashboardPageHeroProps {
  eyebrow?: string;
  title: string;
  description: string;
  stats?: DashboardPageHeroStat[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export const DashboardPageHero: React.FC<DashboardPageHeroProps> = ({
  eyebrow,
  title,
  description,
  stats = [],
  actions,
  children,
}) => (
  <section className="border-b border-border-subtle pb-7">
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div className="max-w-3xl">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">{eyebrow}</p>}
        <h1 className="mt-3 max-w-2xl font-serif text-3xl font-normal leading-tight text-text-primary sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-text-secondary">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div>}
    </div>

    {(stats.length > 0 || children) && (
      <div className="mt-6">
        {stats.length > 0 && (
          <div className="flex flex-wrap gap-x-8 gap-y-3 border-y border-border-subtle py-4">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={index > 0 ? 'border-l border-border-subtle pl-6' : ''}
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-tertiary">{stat.label}</p>
                <p className="mt-1 text-sm font-semibold leading-none text-text-primary">{stat.value}</p>
                {stat.detail && <p className="mt-1 text-xs leading-5 text-text-secondary">{stat.detail}</p>}
              </div>
            ))}
          </div>
        )}
        {children && <div className={stats.length > 0 ? 'mt-4' : ''}>{children}</div>}
      </div>
    )}
  </section>
);
