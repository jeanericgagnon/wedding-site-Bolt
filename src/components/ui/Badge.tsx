import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'neutral', children, ...props }, ref) => {
    const variantStyles = {
      primary: 'bg-primary-light text-primary border-primary/20',
      secondary: 'bg-[#FAF0ED] text-accent border-accent/20',
      success: 'bg-success-light text-success border-success/20',
      warning: 'bg-warning-light text-warning border-warning/20',
      error: 'bg-error-light text-error border-error/20',
      neutral: 'bg-surface text-text-secondary border-border/50',
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
