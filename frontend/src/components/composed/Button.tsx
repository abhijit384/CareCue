import React, { type ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  isSuccess?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      isSuccess = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'relative inline-flex items-center justify-center font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none btn-press-micro rounded-xl';
    
    const variants = {
      primary: 'bg-accent-teal text-text-inverse hover:bg-accent-teal-dark shadow-sm hover:shadow-md focus-visible:ring-accent-teal',
      secondary: 'bg-bg-surface border border-border-default text-text-primary hover:bg-bg-secondary hover:border-accent-teal/40 shadow-xs hover:shadow-sm focus-visible:ring-border-focus',
      danger: 'bg-status-safety-bg border border-status-safety/30 text-status-safety hover:bg-status-safety/20 focus-visible:ring-status-safety shadow-xs',
      ghost: 'bg-transparent text-text-secondary hover:bg-bg-secondary hover:text-text-primary focus-visible:ring-border-default',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-sm sm:text-base px-6 py-3.5 gap-2.5',
    };

    const isDisabled = disabled || isLoading || isSuccess;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        <span className={cn('flex items-center gap-inherit', (isLoading || isSuccess) && 'opacity-0')}>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </span>
        
        {(isLoading || isSuccess) && (
          <span className="absolute inset-0 flex items-center justify-center">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
          </span>
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';
