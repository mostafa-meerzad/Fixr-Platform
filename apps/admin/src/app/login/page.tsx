'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { adminLogin } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: Form) {
    setError('');
    try {
      const res = await adminLogin(data.email, data.password);
      localStorage.setItem('fixr_admin_token', res.accessToken);
      localStorage.setItem('fixr_admin_user', JSON.stringify(res.user));
      router.push('/dashboard');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Invalid credentials');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8">
        <div className="mb-8 text-center">
          <span className="text-3xl font-bold text-[var(--primary)]">Fixr</span>
          <p className="text-sm text-[var(--text-muted)] mt-1">Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="admin@fixr.af"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
