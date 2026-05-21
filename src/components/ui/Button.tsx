import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', fullWidth = false, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none';

    const variantStyles = {
      primary: 'border border-primary bg-primary text-text-inverse hover:bg-primary-hover focus-visible:ring-primary/50',
      secondary: 'border border-border-strong bg-white text-text-primary hover:bg-surface-subtle hover:border-primary/40 focus-visible:ring-primary/50',
      outline: 'border border-border-strong bg-white text-text-primary hover:bg-surface-subtle hover:border-primary/50 focus-visible:ring-primary/50',
      ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle focus-visible:ring-primary/50',
      accent: 'border border-accent bg-accent text-text-inverse hover:bg-accent-hover focus-visible:ring-accent/50',
    };

    const sizeStyles = {
      sm: 'px-4 py-2 text-sm font-medium min-h-[36px] gap-2',
      md: 'px-5 py-2.5 text-sm font-medium min-h-[44px] gap-2',
      lg: 'px-6 py-3 text-base font-semibold min-h-[52px] gap-2',
    };

    const widthStyle = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
