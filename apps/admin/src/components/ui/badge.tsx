import { cn } from '@/lib/utils';

const colorMap: Record<string, string> = {
  // job statuses
  DRAFT: 'bg-gray-700 text-gray-300',
  OPEN: 'bg-blue-900 text-blue-300',
  ASSIGNED: 'bg-indigo-900 text-indigo-300',
  EN_ROUTE: 'bg-purple-900 text-purple-300',
  ARRIVED: 'bg-violet-900 text-violet-300',
  IN_PROGRESS: 'bg-yellow-900 text-yellow-300',
  COMPLETION_REQUESTED: 'bg-orange-900 text-orange-300',
  COMPLETED: 'bg-green-900 text-green-300',
  CANCELLED: 'bg-gray-700 text-gray-400',
  DISPUTED: 'bg-red-900 text-red-300',
  // verification
  PENDING: 'bg-yellow-900 text-yellow-300',
  VERIFIED: 'bg-green-900 text-green-300',
  REJECTED: 'bg-red-900 text-red-300',
  // roles
  HOMEOWNER: 'bg-blue-900 text-blue-300',
  EXPERT: 'bg-teal-900 text-teal-300',
  ADMIN: 'bg-purple-900 text-purple-300',
  // urgency
  LOW: 'bg-gray-700 text-gray-300',
  MEDIUM: 'bg-blue-900 text-blue-300',
  HIGH: 'bg-orange-900 text-orange-300',
  EMERGENCY: 'bg-red-900 text-red-300',
};

interface Props {
  label: string;
  className?: string;
}

export function Badge({ label, className }: Props) {
  const color = colorMap[label] ?? 'bg-gray-700 text-gray-300';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', color, className)}>
      {label}
    </span>
  );
}
