'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/services/admin.service';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/table';
import { PageSpinner } from '@/components/ui/spinner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Category } from '@/types';

interface CatForm { name: string; nameEn: string; icon: string; }
const empty: CatForm = { name: '', nameEn: '', icon: '' };

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Category | null | 'new'>(null);
  const [form, setForm] = useState<CatForm>(empty);
  const [delTarget, setDelTarget] = useState<Category | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => editing === 'new'
      ? createCategory(form)
      : updateCategory((editing as Category).id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setEditing(null); },
  });

  const { mutate: del, isPending: deleting } = useMutation({
    mutationFn: () => deleteCategory(delTarget!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setDelTarget(null); },
  });

  function openNew() { setForm(empty); setEditing('new'); }
  function openEdit(c: Category) { setForm({ name: c.name, nameEn: c.nameEn, icon: c.icon }); setEditing(c); }

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <PageHeader title="Categories" subtitle={`${data?.length ?? 0} categories`}
        action={<Button onClick={openNew}><Plus size={16} /> Add Category</Button>} />

      <Card className="p-0">
        <Table>
          <Thead>
            <tr><Th>Icon</Th><Th>Name (Dari)</Th><Th>Name (EN)</Th><Th>Status</Th><Th /></tr>
          </Thead>
          <Tbody>
            {data?.map((c) => (
              <Tr key={c.id}>
                <Td className="text-[var(--text-muted)] text-xs">{c.icon}</Td>
                <Td>{c.name}</Td>
                <Td>{c.nameEn}</Td>
                <Td>{c.isActive ? <span className="text-green-400 text-xs">Active</span> : <span className="text-[var(--text-muted)] text-xs">Inactive</span>}</Td>
                <Td>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil size={14} /></Button>
                    <Button size="sm" variant="danger" onClick={() => setDelTarget(c)}><Trash2 size={14} /></Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add Category' : 'Edit Category'}>
        <div className="flex flex-col gap-3">
          <Input label="Name (Dari)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="لوله‌کشی" />
          <Input label="Name (English)" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} placeholder="Plumbing" />
          <Input label="Icon (lucide name)" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="droplets" />
          <div className="flex gap-3 mt-1">
            <Button onClick={() => save()} disabled={saving || !form.name || !form.nameEn || !form.icon}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!delTarget} onClose={() => setDelTarget(null)} title={`Delete "${delTarget?.nameEn}"?`}>
        <p className="text-sm text-[var(--text-muted)] mb-4">This soft-deletes the category.</p>
        <div className="flex gap-3">
          <Button variant="danger" onClick={() => del()} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</Button>
          <Button variant="ghost" onClick={() => setDelTarget(null)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  );
}
