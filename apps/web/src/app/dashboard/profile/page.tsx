'use client';

import { useEffect, useState, useCallback } from 'react';
import { get, post } from '@/lib/api-client';

interface SocialAccount {
  id: string;
  platform: string;
  platformUserId: string;
  username: string | null;
  displayName: string | null;
  biography: string | null;
  profilePictureUrl: string | null;
  isVerified: boolean;
  followersCount: number | null;
  likesCount: number | null;
  quotesCount: number | null;
  repostsCount: number | null;
  viewsCount: number | null;
  connectionStatus: string;
  tokenExpiresAt: string | null;
  lastSyncedAt: string | null;
}

export default function ProfilePage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<SocialAccount | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const workspaceId = typeof window !== 'undefined' ? localStorage.getItem('workspaceId') : null;

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    loadAccounts();
  }, [workspaceId]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'threads-oauth-complete') {
        setIsConnecting(false);
        if (event.data.success) {
          setOauthError(null);
          loadAccounts();
        } else {
          setOauthError(event.data.error || 'OAuth failed');
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await get(`/threads/me/accounts?workspaceId=${workspaceId}`);
      if (res.success) {
        const accs = res.data as SocialAccount[];
        setAccounts(accs);
        if (accs.length > 0) {
          setSelectedAccount(accs[0]);
        } else {
          setSelectedAccount(null);
        }
      }
    } catch (err) {
      console.error('Failed to load accounts', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const handleConnect = () => {
    if (!workspaceId) return;
    setOauthError(null);
    setIsConnecting(true);
    const connectUrl = `/api/v1/threads/oauth/start?workspaceId=${workspaceId}`;
    window.open(connectUrl, 'threads-oauth', 'width=600,height=700,scrollbars=yes,left=' + (window.screen.width - 620) + ',top=' + (window.screen.height - 720) / 2);
  };

  const handleRefresh = async () => {
    if (!selectedAccount) return;
    setRefreshing(true);
    try {
      await post(`/threads/me/refresh?accountId=${selectedAccount.id}`, {});
      await loadAccounts();
    } catch (err) {
      console.error('Refresh failed', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return;
    try {
      await post(`/threads/disconnect/${accountId}`, {});
      loadAccounts();
      if (selectedAccount?.id === accountId) {
        setSelectedAccount(null);
      }
    } catch (err) {
      console.error('Disconnect failed', err);
    }
  };

  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return '—';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (!workspaceId) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">Connected Profile</h1>
        <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-700">
          No workspace selected. Go to <a href="/dashboard/workspace" className="underline">Workspace settings</a> to create or select one.
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading accounts...</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Connected Profile</h1>

      {oauthError && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {oauthError}
          <button onClick={() => setOauthError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="mb-4 text-gray-500">No Threads accounts connected yet.</p>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="inline-block rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isConnecting ? 'Connecting...' : 'Connect Threads Account'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Connected accounts</p>
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isConnecting ? 'Connecting...' : '+ Connect Another'}
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => setSelectedAccount(acc)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
                  selectedAccount?.id === acc.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                {acc.profilePictureUrl && (
                  <img
                    src={acc.profilePictureUrl}
                    alt={acc.username || ''}
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <div className="text-left">
                  <p className="font-medium">@{acc.username}</p>
                  <p className="text-xs text-gray-400">{acc.connectionStatus}</p>
                </div>
              </button>
            ))}
          </div>

          {selectedAccount && (
            <div className="rounded-lg border bg-white p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {selectedAccount.profilePictureUrl && (
                    <img
                      src={selectedAccount.profilePictureUrl}
                      alt={selectedAccount.username}
                      className="h-16 w-16 rounded-full"
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold">
                        {selectedAccount.displayName || selectedAccount.username}
                      </h2>
                      {selectedAccount.isVerified && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">@{selectedAccount.username}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="rounded-md bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200 disabled:opacity-50"
                  >
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </button>
                  <button
                    onClick={() => handleDisconnect(selectedAccount.id)}
                    className="rounded-md bg-red-50 px-3 py-1 text-sm text-red-600 hover:bg-red-100"
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              {selectedAccount.biography && (
                <p className="mt-4 text-sm text-gray-700">{selectedAccount.biography}</p>
              )}

              <div className="mt-6 grid gap-4 md:grid-cols-5">
                <div className="rounded-md bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Account ID</p>
                  <p className="mt-1 font-mono text-sm">{selectedAccount.platformUserId}</p>
                </div>
                <div className="rounded-md bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Username</p>
                  <p className="mt-1 font-mono text-sm">@{selectedAccount.username}</p>
                </div>
                <div className="rounded-md bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Display Name</p>
                  <p className="mt-1 text-sm">{selectedAccount.displayName || 'N/A'}</p>
                </div>
                <div className="rounded-md bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Verified</p>
                  <p className="mt-1 text-sm">{selectedAccount.isVerified ? 'Yes' : 'No'}</p>
                </div>
                <div className="rounded-md bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Followers</p>
                  <p className="mt-1 text-sm">{formatNumber(selectedAccount.followersCount)}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <div className="rounded-md bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Likes</p>
                  <p className="mt-1 text-sm">{formatNumber(selectedAccount.likesCount)}</p>
                </div>
                <div className="rounded-md bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Quotes</p>
                  <p className="mt-1 text-sm">{formatNumber(selectedAccount.quotesCount)}</p>
                </div>
                <div className="rounded-md bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Reposts</p>
                  <p className="mt-1 text-sm">{formatNumber(selectedAccount.repostsCount)}</p>
                </div>
                <div className="rounded-md bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Views</p>
                  <p className="mt-1 text-sm">{formatNumber(selectedAccount.viewsCount)}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Source: Meta Threads API | Last synced: {selectedAccount.lastSyncedAt ? new Date(selectedAccount.lastSyncedAt).toLocaleString() : 'Never'}
                </p>
                {selectedAccount.tokenExpiresAt && (
                  <p className="text-xs text-gray-400">
                    Token expires: {new Date(selectedAccount.tokenExpiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
