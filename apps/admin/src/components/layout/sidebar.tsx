'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, ShieldCheck, Briefcase, AlertTriangle,
  CreditCard, MapPin, Tag, Bell, Settings, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Users', href: '/users', icon: Users },
  { label: 'Verification', href: '/verification', icon: ShieldCheck },
  { label: 'Jobs', href: '/jobs', icon: Briefcase },
  { label: 'Disputes', href: '/disputes', icon: AlertTriangle },
  { label: 'Credits', href: '/credits', icon: CreditCard },
  { label: 'Zones', href: '/zones', icon: MapPin },
  { label: 'Categories', href: '/categories', icon: Tag },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    localStorage.removeItem('fixr_admin_token');
    router.push('/login');
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-[var(--bg-card)] border-r border-[var(--border)] flex flex-col">
      <div className="px-6 py-5 border-b border-[var(--border)]">
        <span className="text-lg font-bold text-[var(--primary)]">Fixr</span>
        <span className="text-xs text-[var(--text-muted)] block">Admin Panel</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-colors',
                active
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--text-muted)] hover:bg-[#374151] hover:text-[var(--text)]',
              )}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-[var(--border)]">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-sm text-[var(--text-muted)] hover:bg-[#374151] hover:text-[var(--text)] cursor-pointer transition-colors"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  );
}
