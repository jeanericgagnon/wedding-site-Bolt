import React from 'react';
import { Badge } from '../../../components/ui';

export function renderGuestStatusBadge(status: string): React.ReactNode {
  const variants: Record<string, 'success' | 'error' | 'warning'> = {
    confirmed: 'success',
    declined: 'error',
    pending: 'warning',
  };
  const labels: Record<string, string> = {
    confirmed: 'Confirmed',
    declined: 'Declined',
    pending: 'Pending',
  };

  return <Badge variant={variants[status] || 'warning'}>{labels[status] || status}</Badge>;
}
