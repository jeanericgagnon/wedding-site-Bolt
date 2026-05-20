import React from 'react';
import { Card } from '../ui/Card';

type Tone = 'neutral' | 'error';

export const DashboardStateBlock: React.FC<{
  title: string;
  description?: string;
  tone?: Tone;
}> = ({ title, description, tone = 'neutral' }) => {
  const toneClass: Record<Tone, string> = {
    neutral: 'text-text-primary',
    error: 'text-text-primary',
  };
  return (
    <Card variant="bordered" padding="lg" className="rounded-2xl">
      <p className={`text-sm font-medium ${toneClass[tone]}`}>{title}</p>
      {description ? <p className="text-sm text-text-secondary mt-1">{description}</p> : null}
    </Card>
  );
};
