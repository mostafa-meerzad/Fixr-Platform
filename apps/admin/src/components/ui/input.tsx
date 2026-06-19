import { cn } from '@/lib/utils';
import { forwardRef, type InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(({ label, error, className, ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm text-[var(--text-muted)]">{label}</label>}
    <input
      ref={ref}
      className={cn(
        'bg-[#111827] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]',
        'placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]',
        error && 'border-red-500',
        className,
      )}
      {...props}
    />
    {error && <span className="text-xs text-red-400">{error}</span>}
  </div>
));
Input.displayName = 'Input';
