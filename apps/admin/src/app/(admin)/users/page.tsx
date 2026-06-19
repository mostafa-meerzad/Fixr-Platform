'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getUsers, suspendUser } from '@/services/admin.service';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { PageSpinner } from '@/components/ui/spinner';
import { fmtDate } from '@/lib/utils';

export default function UsersPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [suspendTarget, setSuspendTarget] = useState<{ id: string; name: string; current: boolean } | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users', role, page],
    queryFn: () => getUsers({ role: role || undefined, page, limit: 20 }),
  });

  const { mutate: doSuspend, isPending } = useMutation({
    mutationFn: () => suspendUser(suspendTarget!.id, !suspendTarget!.current, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setSuspendTarget(null);
      setReason('');
    },
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <PageHeader title="Users" subtitle={`${data?.total ?? 0} total`} />

      <div className="flex gap-2 mb-4">
        {['', 'HOMEOWNER', 'EXPERT'].map((r) => (
          <button
            key={r}
            onClick={() => { setRole(r); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${role === r ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'}`}
          >
            {r || 'All'}
          </button>
        ))}
      </div>

      <Card className="p-0">
        <Table>
          <Thead>
            <tr>
              <Th>Name</Th>
              <Th>Phone</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Joined</Th>
              <Th />
            </tr>
          </Thead>
          <Tbody>
            {data?.data.map((u) => (
              <Tr key={u.id} onClick={() => router.push(`/users/${u.id}`)}>
                <Td>{u.name}</Td>
                <Td className="text-[var(--text-muted)]">{u.phone}</Td>
                <Td><Badge label={u.role} /></Td>
                <Td>
                  {u.isSuspended
                    ? <Badge label="SUSPENDED" className="bg-red-900 text-red-300" />
                    : <span className="text-green-400 text-xs">Active</span>}
                </Td>
                <Td className="text-[var(--text-muted)] text-xs">{fmtDate(u.createdAt)}</Td>
                <Td>
                  <Button
                    size="sm"
                    variant={u.isSuspended ? 'secondary' : 'danger'}
                    onClick={(e) => { e.stopPropagation(); setSuspendTarget({ id: u.id, name: u.name, current: u.isSuspended }); }}
                  >
                    {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>

      <Pagination page={page} totalPages={data?.totalPages ?? 1} onPageChange={setPage} />

      <Modal
        open={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        title={suspendTarget?.current ? `Unsuspend ${suspendTarget?.name}` : `Suspend ${suspendTarget?.name}`}
      >
        {!suspendTarget?.current && (
          <Input
            label="Reason (optional)"
            placeholder="e.g. Repeated no-shows"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mb-4"
          />
        )}
        <div className="flex gap-3 mt-2">
          <Button onClick={() => doSuspend()} disabled={isPending} variant={suspendTarget?.current ? 'primary' : 'danger'}>
            {isPending ? 'Saving…' : 'Confirm'}
          </Button>
          <Button variant="ghost" onClick={() => setSuspendTarget(null)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  );
}
