'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { get } from '@/lib/api-client';

const navItems = [
  { label: 'Overview', href: '/dashboard' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Profile', href: '/dashboard/profile' },
  { label: 'Posts', href: '/dashboard/posts' },
  { label: 'Competitors', href: '/dashboard/competitors' },
  { label: 'Keywords', href: '/dashboard/keywords' },
  { label: 'Workspace', href: '/dashboard/workspace' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    get('/auth/profile')
      .then((res) => {
        if (res.success) {
          setUser(res.data);
        } else {
          localStorage.removeItem('access_token');
          router.push('/login');
        }
      })
      .catch(() => {
        localStorage.removeItem('access_token');
        router.push('/login');
      });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-white">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">TMA Dashboard</h2>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
        <nav className="p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t p-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
