'use client';

import { useEffect, useState } from 'react';
import { get, post } from '@/lib/api-client';

interface SearchResult {
  id: string;
  username: string | null;
  text: string | null;
  mediaType: string | null;
  mediaProductType: string | null;
  permalink: string | null;
  timestamp: string | null;
  shortcode: string | null;
  thumbnailUrl: string | null;
  isQuotePost: boolean | null;
  topicTag: string | null;
  isVerified: boolean | null;
  profilePictureUrl: string | null;
  likeCount: number | null;
  replyCount: number | null;
  quoteCount: number | null;
  repostCount: number | null;
  viewCount: number | null;
  shareCount: number | null;
  source?: 'meta_api' | 'local_db';
}

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [queryString, setQueryString] = useState('');
  const [syncFrequency, setSyncFrequency] = useState('manual');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const workspaceId = typeof window !== 'undefined' ? localStorage.getItem('workspaceId') : null;

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    loadKeywords();
  }, [workspaceId]);

  const loadKeywords = async () => {
    try {
      const res = await get(`/monitoring/keywords?workspaceId=${workspaceId}`);
      if (res.success) {
        setKeywords((res.data as any[]) || []);
      }
    } catch (err) {
      console.error('Failed to load keywords', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSearching(true);
    setSearchResults([]);
    setHasSearched(true);

    try {
      if (!searchQuery.trim()) {
        setError('Query is required');
        return;
      }

      const res = await get(`/monitoring/search/keyword?q=${encodeURIComponent(searchQuery)}&workspaceId=${workspaceId}`);
      if (res.success) {
        setSearchResults((res.data as SearchResult[]) || []);
      } else {
        setError(res.error?.message || 'Search failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'An error occurred');
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const res = await post('/monitoring/keywords', {
        workspaceId,
        queryString: queryString.trim(),
        syncFrequency,
      });

      if (res.success) {
        setQueryString('');
        setSyncFrequency('manual');
        loadKeywords();
      } else {
        setError(res.error?.message || 'Failed to save');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'An error occurred');
    } finally {
      setCreating(false);
    }
  };

  const getThumbnail = (post: SearchResult): string | null => {
    if (post.thumbnailUrl) return post.thumbnailUrl;
    if (post.mediaType === 'IMAGE' && post.permalink) return null;
    return null;
  };

  const getMediaTypeIcon = (mediaType: string | null) => {
    switch (mediaType) {
      case 'TEXT_POST': return '📝';
      case 'IMAGE': return '🖼️';
      case 'VIDEO': return '🎬';
      case 'CAROUSEL_ALBUM': return '🎠';
      case 'AUDIO': return '🎵';
      default: return '📄';
    }
  };

  const truncateText = (text: string | null, maxLen: number = 150) => {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
  };

  const getEngagementTotal = (post: SearchResult) => {
    return (
      (post.likeCount || 0) +
      (post.replyCount || 0) +
      (post.quoteCount || 0) +
      (post.repostCount || 0) +
      (post.shareCount || 0)
    );
  };

  if (!workspaceId) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">Keywords</h1>
        <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-700">
          No workspace selected.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Keyword Monitoring</h1>

      <div className="mb-6 rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Search Keyword / Hashtag</h2>
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="keyword or #hashtag"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {hasSearched && searchResults.length === 0 && !searching && (
          <div className="mt-4 rounded-md bg-gray-50 p-4 text-center text-sm text-gray-500">
            No results found for &quot;{searchQuery}&quot;
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Found {searchResults.length} result{searchResults.length > 1 ? 's' : ''}
              </p>
              <span className={`rounded px-2 py-1 text-xs font-medium ${
                searchResults[0]?.source === 'meta_api'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {searchResults[0]?.source === 'meta_api' ? 'Meta API (Live)' : 'Local DB (Cached)'}
              </span>
            </div>
            {searchResults.map((post) => {
              const thumbnail = getThumbnail(post);
              return (
                <div key={post.id} className="rounded-lg border bg-white p-4 hover:bg-gray-50">
                  <div className="flex gap-4">
                    {thumbnail && (
                      <div className="flex-shrink-0">
                        <img
                          src={thumbnail}
                          alt={post.text || ''}
                          className="h-24 w-24 rounded-md object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getMediaTypeIcon(post.mediaType)}</span>
                            <span className="text-xs text-gray-400">{post.mediaType}</span>
                            <span className={`rounded px-1.5 py-0.5 text-xs ${
                              post.source === 'meta_api'
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {post.source === 'meta_api' ? 'API' : 'DB'}
                            </span>
                            {post.isQuotePost && (
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">Quote</span>
                            )}
                            {post.topicTag && (
                              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">#{post.topicTag}</span>
                            )}
                          </div>
                          {post.text && (
                            <p className="mt-2 text-sm text-gray-800">
                              {truncateText(post.text, 200)}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                            {post.profilePictureUrl && (
                              <img
                                src={post.profilePictureUrl}
                                alt=""
                                className="h-4 w-4 rounded-full"
                              />
                            )}
                            {post.username && <span>@{post.username}</span>}
                            {post.isVerified && (
                              <span className="text-blue-500">✓</span>
                            )}
                            <span>•</span>
                            <span>{post.timestamp ? new Date(post.timestamp).toLocaleString() : 'Unknown date'}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <a
                            href={post.permalink || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Open →
                          </a>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">❤️ {post.likeCount ?? '—'}</span>
                        <span className="flex items-center gap-1">💬 {post.replyCount ?? '—'}</span>
                        <span className="flex items-center gap-1">🔄 {post.repostCount ?? '—'}</span>
                        <span className="flex items-center gap-1">📊 {post.quoteCount ?? '—'}</span>
                        <span className="flex items-center gap-1">👁️ {post.viewCount ?? '—'}</span>
                        <span className="font-medium text-gray-700">
                          Total: {getEngagementTotal(post)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mb-6 rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Save Keyword</h2>
        <form onSubmit={handleSave} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={queryString}
            onChange={(e) => setQueryString(e.target.value)}
            className="flex-1 rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="keyword or #hashtag"
            required
          />
          <select
            value={syncFrequency}
            onChange={(e) => setSyncFrequency(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="manual">Manual</option>
            <option value="every_6h">Every 6 hours</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {creating ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Saved Keywords ({keywords.length})</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : keywords.length === 0 ? (
          <p className="text-sm text-gray-500">No keywords saved yet.</p>
        ) : (
          <ul className="space-y-2">
            {keywords.map((kw) => (
              <li key={kw.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">{kw.queryString}</p>
                  <p className="text-xs text-gray-400">
                    Sync: {kw.syncFrequency} | Created {new Date(kw.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    kw.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {kw.isActive ? 'Active' : 'Inactive'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
