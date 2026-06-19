'use client';
import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUser } from '@/services/admin.service';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/spinner';
import { fmtDate } from '@/lib/utils';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: user, isLoading } = useQuery({ queryKey: ['user', id], queryFn: () => getUser(id) });

  if (isLoading) return <PageSpinner />;
  if (!user) return <div className="text-[var(--text-muted)]">User not found.</div>;

  const ep = user.expertProfile;

  return (
    <div>
      <Link href="/users" className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4">
        <ChevronLeft size={16} /> Back to Users
      </Link>
      <PageHeader title={user.name} subtitle={user.phone} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle>Account</CardTitle>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Role"><Badge label={user.role} /></Row>
            <Row label="Status">
              {user.isSuspended
                ? <Badge label="SUSPENDED" className="bg-red-900 text-red-300" />
                : <span className="text-green-400">Active</span>}
            </Row>
            <Row label="Joined">{fmtDate(user.createdAt)}</Row>
          </dl>
        </Card>

        {ep && (
          <>
            <Card>
              <CardTitle>Expert Profile</CardTitle>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label="Verification"><Badge label={ep.verificationStatus} /></Row>
                <Row label="Rating">{ep.rating.toFixed(1)} ★</Row>
                <Row label="Jobs">{ep.completedJobs} / {ep.totalJobs} completed</Row>
                <Row label="Completion Rate">{(ep.completionRate * 100).toFixed(0)}%</Row>
                <Row label="No-shows">{ep.noShowCount}</Row>
                <Row label="Credits">{ep.creditBalance?.balance ?? 0}</Row>
                <Row label="Points">+{ep.positivePoints} / -{ep.negativePoints}</Row>
              </dl>
            </Card>

            {(ep.selfieUrl || ep.tazkiraFrontUrl || ep.tazkiraBackUrl || ep.shopImageUrl || ep.workLicenseUrl) && (
              <Card className="lg:col-span-2">
                <CardTitle>Verification Documents</CardTitle>
                <div className="flex flex-wrap gap-3 mt-3">
                  {[
                    { label: 'Selfie', url: ep.selfieUrl },
                    { label: 'Tazkira Front', url: ep.tazkiraFrontUrl },
                    { label: 'Tazkira Back', url: ep.tazkiraBackUrl },
                    { label: 'Shop Image', url: ep.shopImageUrl },
                    { label: 'Work License', url: ep.workLicenseUrl },
                  ].filter((d) => d.url).map((d) => (
                    <a key={d.label} href={d.url!} target="_blank" rel="noreferrer"
                      className="group relative overflow-hidden rounded-lg border border-[var(--border)] w-32 h-32 bg-[#111827]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={d.url!} alt={d.label} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-white">{d.label}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </Card>
            )}

            {ep.serviceZones && ep.serviceZones.length > 0 && (
              <Card>
                <CardTitle>Service Zones</CardTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ep.serviceZones.map((z) => (
                    <span key={z.id} className="text-xs bg-[#374151] text-[var(--text)] rounded px-2 py-1">{z.name} · {z.nameEn}</span>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="font-medium text-[var(--text)]">{children}</dd>
    </div>
  );
}
