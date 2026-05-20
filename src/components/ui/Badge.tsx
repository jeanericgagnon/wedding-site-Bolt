import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'neutral', children, ...props }, ref) => {
    const variantStyles = {
      primary: 'bg-primary-light text-primary border-primary/20',
      secondary: 'bg-surface-subtle text-text-secondary border-border/60',
      success: 'bg-success-light text-success border-success/20',
      warning: 'bg-surface-subtle text-text-secondary border-border-subtle',
      error: 'bg-surface-subtle text-text-secondary border-border-subtle',
      neutral: 'bg-surface text-text-secondary border-border/50',
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center rounded-xl border px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
