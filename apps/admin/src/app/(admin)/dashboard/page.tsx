'use client';
import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '@/services/admin.service';
import { Card, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import { PageSpinner } from '@/components/ui/spinner';
import { Users, Briefcase, ShieldCheck, CreditCard, AlertTriangle } from 'lucide-react';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard });

  if (isLoading) return <PageSpinner />;
  if (!data) return null;

  const stats = [
    { label: 'Total Users', value: data.users.total, sub: `${data.users.active} active`, icon: Users, color: 'text-blue-400' },
    { label: 'Verified Experts', value: data.experts.verified, sub: `${data.experts.pendingVerification} pending`, icon: ShieldCheck, color: 'text-[var(--primary)]' },
    { label: 'Open Jobs', value: data.jobs.open, sub: `${data.jobs.assigned} assigned`, icon: Briefcase, color: 'text-yellow-400' },
    { label: 'Completed Jobs', value: data.jobs.completed, sub: `${data.jobs.cancelled} cancelled`, icon: Briefcase, color: 'text-green-400' },
    { label: 'Disputed Jobs', value: data.jobs.disputed, sub: 'needs review', icon: AlertTriangle, color: 'text-red-400' },
    { label: 'Credits Purchased', value: data.credits.purchasedThisMonth, sub: 'this month', icon: CreditCard, color: 'text-purple-400' },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Platform overview" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{s.label}</CardTitle>
                <div className="text-3xl font-bold text-[var(--text)] mt-1">{s.value}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">{s.sub}</div>
              </div>
              <s.icon className={s.color} size={28} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
