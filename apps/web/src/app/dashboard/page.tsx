'use client';

import { useEffect, useState } from 'react';
import { get } from '@/lib/api-client';

export default function DashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const workspaceId = typeof window !== 'undefined' ? localStorage.getItem('workspaceId') : null;

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    Promise.all([
      get(`/dashboard/overview?workspaceId=${workspaceId}`),
      get(`/threads/me/accounts?workspaceId=${workspaceId}`),
    ])
      .then(([overviewRes, accountsRes]) => {
        if (overviewRes.success) setOverview(overviewRes.data);
        if (accountsRes.success) setAccounts((accountsRes.data as any[]) || []);
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">Dashboard</h1>
        <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-700">
          No workspace selected. Go to{' '}
          <a href="/dashboard/workspace" className="underline">
            Workspace settings
          </a>{' '}
          to create or select one.
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard Overview</h1>

      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Connected Accounts</p>
          <p className="mt-2 text-3xl font-bold">{accounts.length}</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Total Posts</p>
          <p className="mt-2 text-3xl font-bold">{overview?.totalPosts || 0}</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Keywords</p>
          <p className="mt-2 text-3xl font-bold">{overview?.totalKeywords || 0}</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Competitors</p>
          <p className="mt-2 text-3xl font-bold">{overview?.totalCompetitors || 0}</p>
        </div>
      </div>

      {accounts.length === 0 && (
        <div className="rounded-lg border bg-blue-50 p-6">
          <h3 className="mb-2 font-medium text-blue-800">Get Started</h3>
          <p className="mb-4 text-sm text-blue-600">
            Connect your Threads account to start monitoring your performance.
          </p>
          <a
            href={`/api/v1/threads/oauth/start?workspaceId=${workspaceId}`}
            className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Connect Threads Account
          </a>
        </div>
      )}

      {overview?.lastUpdatedAt && (
        <p className="mt-4 text-xs text-gray-400">
          Last updated: {new Date(overview.lastUpdatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
