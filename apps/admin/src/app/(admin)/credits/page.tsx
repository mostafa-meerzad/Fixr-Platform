'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, getCreditLedger, purchaseCredits, adjustCredits } from '@/services/admin.service';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { PageSpinner } from '@/components/ui/spinner';
import { fmtDate } from '@/lib/utils';
import type { User } from '@/types';

type ModalMode = 'purchase' | 'adjust' | 'ledger';

export default function CreditsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<ModalMode | null>(null);
  const [expert, setExpert] = useState<User | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [ledgerPage, setLedgerPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['experts', page],
    queryFn: () => getUsers({ role: 'EXPERT', page, limit: 20 }),
  });

  const { data: ledger } = useQuery({
    queryKey: ['ledger', expert?.id, ledgerPage],
    queryFn: () => getCreditLedger(expert!.id, { page: ledgerPage, limit: 20 }),
    enabled: mode === 'ledger' && !!expert,
  });

  const { mutate: doPurchase, isPending: buying } = useMutation({
    mutationFn: () => purchaseCredits(expert!.id, Number(amount), note),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['experts'] }); closeModal(); },
  });

  const { mutate: doAdjust, isPending: adjusting } = useMutation({
    mutationFn: () => adjustCredits(expert!.id, Number(amount), note),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['experts'] }); closeModal(); },
  });

  function openModal(u: User, m: ModalMode) { setExpert(u); setMode(m); setAmount(''); setNote(''); setLedgerPage(1); }
  function closeModal() { setMode(null); setExpert(null); }

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <PageHeader title="Credits" subtitle="Expert credit management" />
      <Card className="p-0">
        <Table>
          <Thead>
            <tr>
              <Th>Expert</Th>
              <Th>Phone</Th>
              <Th>Balance</Th>
              <Th />
            </tr>
          </Thead>
          <Tbody>
            {data?.data.map((u) => (
              <Tr key={u.id}>
                <Td>{u.name}</Td>
                <Td className="text-[var(--text-muted)]">{u.phone}</Td>
                <Td className="font-semibold text-[var(--primary)]">
                  {u.expertProfile?.creditBalance?.balance ?? 0}
                </Td>
                <Td>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => openModal(u, 'purchase')}>Purchase</Button>
                    <Button size="sm" variant="secondary" onClick={() => openModal(u, 'adjust')}>Adjust</Button>
                    <Button size="sm" variant="ghost" onClick={() => openModal(u, 'ledger')}>Ledger</Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>
      <Pagination page={page} totalPages={data?.totalPages ?? 1} onPageChange={setPage} />

      {/* Purchase modal */}
      <Modal open={mode === 'purchase'} onClose={closeModal} title={`Purchase credits — ${expert?.name}`}>
        <div className="flex flex-col gap-3">
          <Input label="Credits" type="number" min="1" placeholder="10" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input label="Note" placeholder="Receipt #42" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-3 mt-1">
            <Button onClick={() => doPurchase()} disabled={buying || !amount || !note}>
              {buying ? 'Saving…' : 'Confirm Purchase'}
            </Button>
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Adjust modal */}
      <Modal open={mode === 'adjust'} onClose={closeModal} title={`Adjust credits — ${expert?.name}`}>
        <div className="flex flex-col gap-3">
          <Input label="Amount (negative to deduct)" type="number" placeholder="-2 or 5" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input label="Reason" placeholder="Penalty after investigation" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-3 mt-1">
            <Button onClick={() => doAdjust()} disabled={adjusting || !amount || !note}>
              {adjusting ? 'Saving…' : 'Confirm Adjustment'}
            </Button>
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Ledger modal */}
      <Modal open={mode === 'ledger'} onClose={closeModal} title={`Credit ledger — ${expert?.name}`} className="max-w-2xl">
        {ledger ? (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>Type</Th>
                  <Th>Amount</Th>
                  <Th>Balance After</Th>
                  <Th>Description</Th>
                  <Th>Date</Th>
                </tr>
              </Thead>
              <Tbody>
                {ledger.data.map((tx) => (
                  <Tr key={tx.id}>
                    <Td className="text-xs text-[var(--text-muted)]">{tx.type}</Td>
                    <Td className={tx.amount >= 0 ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                      {tx.amount >= 0 ? '+' : ''}{tx.amount}
                    </Td>
                    <Td>{tx.balanceAfter}</Td>
                    <Td className="text-xs text-[var(--text-muted)]">{tx.description}</Td>
                    <Td className="text-xs text-[var(--text-muted)]">{fmtDate(tx.createdAt)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            <Pagination page={ledgerPage} totalPages={ledger.totalPages} onPageChange={setLedgerPage} />
          </>
        ) : <PageSpinner />}
      </Modal>
    </div>
  );
}
