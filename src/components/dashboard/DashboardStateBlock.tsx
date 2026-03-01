import React from 'react';
import { Card } from '../ui/Card';

type Tone = 'neutral' | 'error';

export const DashboardStateBlock: React.FC<{
  title: string;
  description?: string;
  tone?: Tone;
}> = ({ title, description, tone = 'neutral' }) => {
  const toneClass = tone === 'error' ? 'text-error' : 'text-text-primary';
  return (
    <Card variant="bordered" padding="lg" className="rounded-xl">
      <p className={`text-sm font-medium ${toneClass}`}>{title}</p>
      {description ? <p className="text-sm text-text-secondary mt-1">{description}</p> : null}
    </Card>
  );
};
