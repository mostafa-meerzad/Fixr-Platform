'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { PageSpinner } from '@/components/ui/spinner';
import { fmtDate } from '@/lib/utils';
import type { Job, Paginated, JobStatus } from '@/types';

const STATUSES: JobStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETION_REQUESTED', 'COMPLETED', 'DISPUTED', 'CANCELLED'];

function fetchJobs(status: string, page: number) {
  return api.get<Paginated<Job>>('/jobs', { params: { status: status || undefined, page, limit: 20 } }).then((r) => r.data);
}

export default function JobsPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', status, page],
    queryFn: () => fetchJobs(status, page),
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <PageHeader title="Jobs" subtitle={`${data?.total ?? 0} total`} />

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => { setStatus(''); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${!status ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'}`}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${status === s ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <Card className="p-0">
        <Table>
          <Thead>
            <tr><Th>Title</Th><Th>Status</Th><Th>Urgency</Th><Th>Homeowner</Th><Th>Expert</Th><Th>Zone</Th><Th>Date</Th></tr>
          </Thead>
          <Tbody>
            {data?.data.map((j) => (
              <Tr key={j.id}>
                <Td className="max-w-xs truncate font-medium">{j.title}</Td>
                <Td><Badge label={j.status} /></Td>
                <Td><Badge label={j.urgency} /></Td>
                <Td className="text-[var(--text-muted)] text-xs">{j.homeowner?.name ?? '—'}</Td>
                <Td className="text-[var(--text-muted)] text-xs">{j.expert?.name ?? '—'}</Td>
                <Td className="text-[var(--text-muted)] text-xs">{j.zone?.nameEn ?? '—'}</Td>
                <Td className="text-[var(--text-muted)] text-xs">{fmtDate(j.createdAt)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>
      <Pagination page={page} totalPages={data?.totalPages ?? 1} onPageChange={setPage} />
    </div>
  );
}
