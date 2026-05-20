'use client';

import { useEffect, useState } from 'react';
import { get, post } from '@/lib/api-client';

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const workspaceId = typeof window !== 'undefined' ? localStorage.getItem('workspaceId') : null;

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    loadCompetitors();
  }, [workspaceId]);

  const loadCompetitors = async () => {
    try {
      const res = await get(`/monitoring/competitors?workspaceId=${workspaceId}`);
      if (res.success) {
        setCompetitors((res.data as any[]) || []);
      }
    } catch (err) {
      console.error('Failed to load competitors', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSearching(true);
    setSearchResult(null);

    try {
      const cleanUsername = username.replace(/^@/, '').trim();
      if (!cleanUsername) {
        setError('Username is required');
        return;
      }

      const res = await get(`/monitoring/search/user/${cleanUsername}?workspaceId=${workspaceId}`);
      if (res.success) {
        setSearchResult(res.data);
      } else {
        setError(res.error?.message || 'Search failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'An error occurred');
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async () => {
    if (!searchResult) return;
    setError('');
    setCreating(true);

    try {
      const res = await post('/monitoring/competitors', {
        workspaceId,
        username: searchResult.username || username.replace(/^@/, ''),
        displayName: searchResult.name || displayName,
      });

      if (res.success) {
        setUsername('');
        setDisplayName('');
        setSearchResult(null);
        loadCompetitors();
      } else {
        setError(res.error?.message || 'Failed to save');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'An error occurred');
    } finally {
      setCreating(false);
    }
  };

  if (!workspaceId) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">Competitors</h1>
        <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-700">
          No workspace selected.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Competitor Monitoring</h1>

      <div className="mb-6 rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Search Competitor</h2>
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="flex-1 rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="@username"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {searchResult && (
          <div className="mt-4 rounded-md border p-4">
            <div className="flex items-start gap-4">
              {searchResult.profile_picture_url && (
                <img
                  src={searchResult.profile_picture_url}
                  alt={searchResult.username}
                  className="h-12 w-12 rounded-full"
                />
              )}
              <div className="flex-1">
                <p className="font-medium">
                  @{searchResult.username || username}
                  {searchResult.is_verified && (
                    <span className="ml-1 text-blue-500">✓</span>
                  )}
                </p>
                <p className="text-sm text-gray-600">{searchResult.name || ''}</p>
                {searchResult.biography && (
                  <p className="mt-1 text-sm text-gray-500">{searchResult.biography}</p>
                )}
                <div className="mt-2 flex gap-4 text-xs text-gray-500">
                  <span>👥 {searchResult.follower_count ?? '—'} followers</span>
                  <span>❤️ {searchResult.likes_count ?? '—'} likes</span>
                  <span>📊 {searchResult.views_count ?? '—'} views</span>
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={creating}
                className="rounded-md bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                {creating ? 'Saving...' : 'Add'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Watchlist ({competitors.length})</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : competitors.length === 0 ? (
          <p className="text-sm text-gray-500">No competitors added yet.</p>
        ) : (
          <ul className="space-y-2">
            {competitors.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">@{c.username}</p>
                  <p className="text-xs text-gray-400">
                    Added {new Date(c.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {c.isActive ? 'Active' : 'Inactive'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
