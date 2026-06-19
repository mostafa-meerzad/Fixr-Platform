'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCreditRate, updateCreditRate } from '@/services/admin.service';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageSpinner } from '@/components/ui/spinner';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';

interface RateForm { afnPerCredit: number; welcomeCredits: number; welcomeExpiryDays: number; }

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: rate, isLoading } = useQuery({ queryKey: ['credit-rate'], queryFn: getCreditRate });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<RateForm>();

  useEffect(() => {
    if (rate) reset({ afnPerCredit: rate.afnPerCredit, welcomeCredits: rate.welcomeCredits, welcomeExpiryDays: rate.welcomeExpiryDays });
  }, [rate, reset]);

  const { mutateAsync } = useMutation({
    mutationFn: updateCreditRate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credit-rate'] }),
  });

  async function onSubmit(data: RateForm) {
    await mutateAsync(data);
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Platform configuration" />
      <div className="max-w-md">
        <Card>
          <CardTitle>Credit Rate</CardTitle>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-3">
            <Input
              label="AFN per credit"
              type="number"
              min="1"
              {...register('afnPerCredit', { valueAsNumber: true })}
            />
            <Input
              label="Welcome credits (on expert verification)"
              type="number"
              min="0"
              {...register('welcomeCredits', { valueAsNumber: true })}
            />
            <Input
              label="Welcome credits expiry (days)"
              type="number"
              min="1"
              {...register('welcomeExpiryDays', { valueAsNumber: true })}
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
