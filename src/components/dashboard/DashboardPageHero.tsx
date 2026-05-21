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
  <section>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <div className="max-w-3xl">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>}
        <h1 className="mt-3 max-w-3xl font-serif text-4xl font-normal leading-[1.08] text-text-primary sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-text-secondary">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3 lg:justify-end">{actions}</div>}
    </div>

    {(stats.length > 0 || children) && (
      <div className="mt-7">
        {stats.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={`min-h-[120px] rounded-[20px] border border-border bg-surface p-5 shadow-none ${index > 2 ? 'xl:hidden' : ''}`}
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-tertiary">{stat.label}</p>
                <p className="mt-3 text-2xl font-semibold leading-tight text-text-primary">{stat.value}</p>
                {stat.detail && <p className="mt-2 text-sm leading-6 text-text-secondary">{stat.detail}</p>}
              </div>
            ))}
          </div>
        )}
        {children && <div className={stats.length > 0 ? 'mt-5' : ''}>{children}</div>}
      </div>
    )}
  </section>
);
