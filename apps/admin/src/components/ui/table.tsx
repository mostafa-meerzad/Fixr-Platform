import { cn } from '@/lib/utils';

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-sm', className)}>{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn('px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider', className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 text-[var(--text)]', className)}>{children}</td>;
}

export function Tr({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={cn('border-t border-[var(--border)] hover:bg-white/[0.02]', onClick && 'cursor-pointer', className)}
    >
      {children}
    </tr>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-[#111827]">{children}</thead>;
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}
