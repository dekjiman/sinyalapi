'use client';

import { useEffect, useState } from 'react';
import { get, post } from '@/lib/api-client';

export default function WorkspacePage() {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const res = await get('/workspaces');
      if (res.success) {
        setWorkspaces((res.data as any[]) || []);
      }
    } catch (err) {
      console.error('Failed to load workspaces', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const res = await post('/workspaces', { name });
      if (res.success) {
        setName('');
        loadWorkspaces();
      } else {
        setError(res.error?.message || 'Failed to create workspace');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'An error occurred');
    } finally {
      setCreating(false);
    }
  };

  const selectWorkspace = (id: string) => {
    localStorage.setItem('workspaceId', id);
    window.location.href = '/dashboard';
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading workspaces...</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Workspace</h1>

      <div className="mb-6 rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Create Workspace</h2>
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Workspace name"
            required
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </form>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Your Workspaces</h2>
        {workspaces.length === 0 ? (
          <p className="text-sm text-gray-500">No workspaces yet. Create one above.</p>
        ) : (
          <ul className="space-y-2">
            {workspaces.map((ws) => (
              <li
                key={ws.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="font-medium">{ws.name}</p>
                  <p className="text-xs text-gray-400">Plan: {ws.plan}</p>
                </div>
                <button
                  onClick={() => selectWorkspace(ws.id)}
                  className="rounded-md bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                >
                  Select
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
