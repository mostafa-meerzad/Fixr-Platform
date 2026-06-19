'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPendingVerifications, setVerificationStatus } from '@/services/admin.service';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { PageSpinner } from '@/components/ui/spinner';
import { CheckCircle, XCircle, User } from 'lucide-react';
import type { User as UserType } from '@/types';

export default function VerificationPage() {
  const qc = useQueryClient();
  const [target, setTarget] = useState<{ user: UserType; action: 'VERIFIED' | 'REJECTED' } | null>(null);
  const [note, setNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['verification-pending'],
    queryFn: getPendingVerifications,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () => setVerificationStatus(target!.user.id, target!.action, note || null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['verification-pending'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setTarget(null);
      setNote('');
    },
  });

  if (isLoading) return <PageSpinner />;

  const ep = (u: UserType) => u.expertProfile;

  return (
    <div>
      <PageHeader title="Expert Verification" subtitle={`${data?.length ?? 0} pending`} />

      {data?.length === 0 && (
        <Card className="text-center py-12">
          <CheckCircle className="mx-auto text-green-400 mb-3" size={36} />
          <p className="text-[var(--text-muted)]">No pending verifications</p>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {data?.map((u) => (
          <Card key={u.id}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#374151] flex items-center justify-center flex-shrink-0">
                {ep(u)?.selfieUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={ep(u)!.selfieUrl!} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                  : <User size={20} className="text-[var(--text-muted)]" />}
              </div>
              <div>
                <div className="font-medium text-[var(--text)]">{u.name}</div>
                <div className="text-sm text-[var(--text-muted)]">{u.phone}</div>
              </div>
            </div>

            {ep(u)?.serviceZones && ep(u)!.serviceZones!.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {ep(u)!.serviceZones!.map((z) => (
                  <span key={z.id} className="text-xs bg-[#374151] text-[var(--text)] rounded px-2 py-0.5">{z.nameEn}</span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: 'Selfie', url: ep(u)?.selfieUrl },
                { label: 'Tazkira F', url: ep(u)?.tazkiraFrontUrl },
                { label: 'Tazkira B', url: ep(u)?.tazkiraBackUrl },
                { label: 'Shop', url: ep(u)?.shopImageUrl },
                { label: 'License', url: ep(u)?.workLicenseUrl },
              ].filter((d) => d.url).map((d) => (
                <a key={d.label} href={d.url!} target="_blank" rel="noreferrer"
                  className="relative overflow-hidden rounded-lg border border-[var(--border)] h-24 bg-[#111827] group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.url!} alt={d.label} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 flex items-end p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-white">{d.label}</span>
                  </div>
                </a>
              ))}
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={() => setTarget({ user: u, action: 'VERIFIED' })}>
                <CheckCircle size={15} /> Verify
              </Button>
              <Button size="sm" variant="danger" onClick={() => setTarget({ user: u, action: 'REJECTED' })}>
                <XCircle size={15} /> Reject
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title={target?.action === 'VERIFIED' ? `Verify ${target?.user.name}` : `Reject ${target?.user.name}`}
      >
        {target?.action === 'REJECTED' && (
          <div className="mb-4">
            <label className="text-sm text-[var(--text-muted)] block mb-1">Rejection note</label>
            <textarea
              className="w-full bg-[#111827] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] resize-none h-24"
              placeholder="e.g. Tazkira image is unclear. Please resubmit."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        )}
        {target?.action === 'VERIFIED' && (
          <p className="text-sm text-[var(--text-muted)] mb-4">
            This will grant welcome credits and notify the expert.
          </p>
        )}
        <div className="flex gap-3">
          <Button
            onClick={() => mutate()}
            disabled={isPending || (target?.action === 'REJECTED' && !note.trim())}
            variant={target?.action === 'VERIFIED' ? 'primary' : 'danger'}
          >
            {isPending ? 'Saving…' : 'Confirm'}
          </Button>
          <Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  );
}
