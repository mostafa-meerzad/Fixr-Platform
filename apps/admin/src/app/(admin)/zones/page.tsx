'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getZones, createZone, updateZone, deleteZone } from '@/services/admin.service';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/table';
import { PageSpinner } from '@/components/ui/spinner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Zone } from '@/types';

interface ZoneForm { name: string; nameEn: string; latitude: string; longitude: string; }
const empty: ZoneForm = { name: '', nameEn: '', latitude: '', longitude: '' };

export default function ZonesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Zone | null | 'new'>(null);
  const [form, setForm] = useState<ZoneForm>(empty);
  const [delTarget, setDelTarget] = useState<Zone | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['zones'], queryFn: getZones });

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => editing === 'new'
      ? createZone({ name: form.name, nameEn: form.nameEn, latitude: Number(form.latitude), longitude: Number(form.longitude) })
      : updateZone((editing as Zone).id, { name: form.name, nameEn: form.nameEn, latitude: Number(form.latitude), longitude: Number(form.longitude) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['zones'] }); setEditing(null); },
  });

  const { mutate: del, isPending: deleting } = useMutation({
    mutationFn: () => deleteZone(delTarget!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['zones'] }); setDelTarget(null); },
  });

  function openNew() { setForm(empty); setEditing('new'); }
  function openEdit(z: Zone) { setForm({ name: z.name, nameEn: z.nameEn, latitude: String(z.latitude), longitude: String(z.longitude) }); setEditing(z); }

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <PageHeader title="Zones" subtitle={`${data?.length ?? 0} zones`}
        action={<Button onClick={openNew}><Plus size={16} /> Add Zone</Button>} />

      <Card className="p-0">
        <Table>
          <Thead>
            <tr><Th>Name (Dari)</Th><Th>Name (EN)</Th><Th>Lat</Th><Th>Lng</Th><Th>Status</Th><Th /></tr>
          </Thead>
          <Tbody>
            {data?.map((z) => (
              <Tr key={z.id}>
                <Td>{z.name}</Td>
                <Td>{z.nameEn}</Td>
                <Td className="text-[var(--text-muted)] text-xs">{z.latitude}</Td>
                <Td className="text-[var(--text-muted)] text-xs">{z.longitude}</Td>
                <Td>{z.isActive ? <span className="text-green-400 text-xs">Active</span> : <span className="text-[var(--text-muted)] text-xs">Inactive</span>}</Td>
                <Td>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(z)}><Pencil size={14} /></Button>
                    <Button size="sm" variant="danger" onClick={() => setDelTarget(z)}><Trash2 size={14} /></Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add Zone' : 'Edit Zone'}>
        <div className="flex flex-col gap-3">
          <Input label="Name (Dari)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="کارته سه" />
          <Input label="Name (English)" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} placeholder="Karte Seh" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Latitude" type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="34.5143" />
            <Input label="Longitude" type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="69.1716" />
          </div>
          <div className="flex gap-3 mt-1">
            <Button onClick={() => save()} disabled={saving || !form.name || !form.nameEn || !form.latitude || !form.longitude}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!delTarget} onClose={() => setDelTarget(null)} title={`Delete "${delTarget?.nameEn}"?`}>
        <p className="text-sm text-[var(--text-muted)] mb-4">This soft-deletes the zone. Existing expert assignments remain.</p>
        <div className="flex gap-3">
          <Button variant="danger" onClick={() => del()} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</Button>
          <Button variant="ghost" onClick={() => setDelTarget(null)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  );
}
