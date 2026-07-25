'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDisputes, resolveDispute } from '@/services/admin.service';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { PageSpinner } from '@/components/ui/spinner';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/table';
import { fmtDate } from '@/lib/utils';
import type { Dispute } from '@/types';

export default function DisputesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['disputes', page],
    queryFn: () => getDisputes({ page, limit: 20 }),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () => resolveDispute(selected!.id, resolution),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disputes'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setSelected(null);
      setResolution('');
    },
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <PageHeader title="Disputes" subtitle={`${data?.total ?? 0} total`} />
      <Card className="p-0">
        <Table>
          <Thead>
            <tr>
              <Th>Reason</Th>
              <Th>Job</Th>
              <Th>Raised By</Th>
              <Th>Date</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </Thead>
          <Tbody>
            {data?.data.map((d) => (
              <Tr key={d.id}>
                <Td><Badge label={d.reason} className="bg-red-900 text-red-300" /></Td>
                <Td className="text-[var(--text-muted)] text-xs">{d.job?.title ?? d.job?.id ?? '—'}</Td>
                <Td>{d.reporter?.name ?? '—'}</Td>
                <Td className="text-[var(--text-muted)] text-xs">{fmtDate(d.createdAt)}</Td>
                <Td>
                  {d.resolvedAt
                    ? <span className="text-green-400 text-xs">Resolved</span>
                    : <span className="text-yellow-400 text-xs">Open</span>}
                </Td>
                <Td>
                  {!d.resolvedAt && (
                    <Button size="sm" onClick={() => setSelected(d)}>Resolve</Button>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>
      <Pagination page={page} totalPages={data?.totalPages ?? 1} onPageChange={setPage} />

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Resolve Dispute">
        <div className="mb-3 text-sm text-[var(--text-muted)]">
          <strong className="text-[var(--text)]">{selected?.reason}</strong> — {selected?.description}
        </div>
        <label className="text-sm text-[var(--text-muted)] block mb-1">Resolution note</label>
        <textarea
          className="w-full bg-[#111827] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] resize-none h-24"
          placeholder="Describe the resolution…"
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
        />
        <div className="flex gap-3 mt-4">
          <Button onClick={() => mutate()} disabled={isPending || !resolution.trim()}>
            {isPending ? 'Saving…' : 'Mark Resolved'}
          </Button>
          <Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  );
}
