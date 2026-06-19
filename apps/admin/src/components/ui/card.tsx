import { cn } from '@/lib/utils';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('text-sm font-medium text-[var(--text-muted)] mb-1', className)}>{children}</h3>;
}
