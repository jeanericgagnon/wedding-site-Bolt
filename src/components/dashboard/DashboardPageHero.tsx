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
  <section className="overflow-hidden rounded-lg border border-border-subtle bg-white shadow-sm">
    <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div className="max-w-3xl">
        {eyebrow && <p className="text-xs font-medium text-text-tertiary">{eyebrow}</p>}
        <h1 className="mt-2 text-2xl font-semibold leading-tight text-text-primary sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div>}
    </div>

    {(stats.length > 0 || children) && (
      <div className="border-t border-border-subtle bg-surface-subtle/35 p-4">
        {stats.length > 0 && (
          <div className="grid gap-0 overflow-hidden rounded-lg border border-border-subtle bg-white sm:grid-cols-3">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={`px-4 py-3 ${index > 0 ? 'border-t border-border-subtle sm:border-l sm:border-t-0' : ''}`}
              >
                <p className="text-xs text-text-tertiary">{stat.label}</p>
                <p className="mt-1 text-xl font-semibold leading-none text-text-primary">{stat.value}</p>
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
