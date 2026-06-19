'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAdminNotifications } from '@/services/admin.service';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { PageSpinner } from '@/components/ui/spinner';
import { fmtDateTime } from '@/lib/utils';

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-notifications', page],
    queryFn: () => getAdminNotifications({ page, limit: 30 }),
  });

  if (isLoading) return <PageSpinner />;

  type NotifItem = { id: string; type: string; titleEn: string; bodyEn: string; sentAt: string; recipient?: { name: string } };
  const typed = data as { data?: NotifItem[]; total?: number; totalPages?: number } | undefined;
  const items: NotifItem[] = typed?.data ?? [];
  const total: number = typed?.total ?? 0;
  const totalPages: number = typed?.totalPages ?? 1;

  return (
    <div>
      <PageHeader title="Notification Log" subtitle={`${total} total`} />
      <Card className="p-0">
        <Table>
          <Thead>
            <tr><Th>Type</Th><Th>Title</Th><Th>Body</Th><Th>Recipient</Th><Th>Sent</Th></tr>
          </Thead>
          <Tbody>
            {items.map((n) => (
              <Tr key={n.id}>
                <Td className="text-xs text-[var(--text-muted)]">{n.type}</Td>
                <Td className="text-sm">{n.titleEn}</Td>
                <Td className="text-xs text-[var(--text-muted)] max-w-xs truncate">{n.bodyEn}</Td>
                <Td className="text-xs text-[var(--text-muted)]">{n.recipient?.name ?? '—'}</Td>
                <Td className="text-xs text-[var(--text-muted)]">{fmtDateTime(n.sentAt)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
