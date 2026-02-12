import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label, error, helperText, id, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${textareaId}-error` : undefined;
    const helperId = helperText ? `${textareaId}-helper` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-text-primary mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`
            w-full px-3.5 py-2.5 text-base
            bg-surface-raised border border-border rounded-lg
            text-text-primary placeholder:text-text-tertiary
            hover:border-border-strong
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border
            transition-all duration-200 resize-vertical
            ${error ? 'border-error focus:ring-error/20 focus:border-error hover:border-error' : ''}
            ${className}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-error font-medium" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-sm text-text-secondary">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
