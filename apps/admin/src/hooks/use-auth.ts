'use client';
import { useState, useEffect } from 'react';
import type { AdminUser } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('fixr_admin_token');
    const stored = localStorage.getItem('fixr_admin_user');
    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        // malformed
      }
    }
    setLoading(false);
  }, []);

  return { user, loading };
}
