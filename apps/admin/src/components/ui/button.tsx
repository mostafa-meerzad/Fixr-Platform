'use client';
import { cn } from '@/lib/utils';
import { type ButtonHTMLAttributes, forwardRef } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  primary: 'bg-[#2D9B6F] hover:bg-[#25845e] text-white',
  secondary: 'bg-[#374151] hover:bg-[#4b5563] text-white',
  danger: 'bg-[#E85D5D] hover:bg-[#d14b4b] text-white',
  ghost: 'bg-transparent hover:bg-[#374151] text-[#9ca3af]',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = 'primary', size = 'md', disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-2 font-medium rounded-lg transition-colors cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
