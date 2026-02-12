import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'neutral', children, ...props }, ref) => {
    const variantStyles = {
      primary: 'bg-primary-light text-primary border-primary',
      secondary: 'bg-champagne-100 text-champagne-800 border-champagne-200',
      success: 'bg-success-light text-success border-success',
      warning: 'bg-warning-light text-warning border-warning',
      error: 'bg-error-light text-error border-error',
      neutral: 'bg-stone-100 text-stone-700 border-stone-200',
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
