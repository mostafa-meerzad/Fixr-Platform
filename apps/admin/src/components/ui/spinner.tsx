import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]', className)} />
  );
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
