'use client';

import { useEffect, useState } from 'react';
import { get } from '@/lib/api-client';

interface PostMetric {
  likes: number | null;
  replies: number | null;
  quotes: number | null;
  reposts: number | null;
  views: number | null;
  shares: number | null;
  engagementTotal: number | null;
  engagementRate: number | null;
}

interface Post {
  id: string;
  externalPostId: string;
  authorUsername: string | null;
  postText: string | null;
  permalink: string | null;
  mediaType: string | null;
  mediaProductType: string | null;
  publishedAt: string | null;
  shortcode: string | null;
  thumbnailUrl: string | null;
  isQuotePost: boolean | null;
  topicTag: string | null;
  isVerified: boolean | null;
  authorProfilePictureUrl: string | null;
  altText: string | null;
  gifUrl: string | null;
  linkAttachmentUrl: string | null;
  rawPayload: any;
  metrics: PostMetric[];
}

type SortKey = 'likes' | 'replies' | 'reposts' | 'views' | 'timestamp';
type SortDir = 'asc' | 'desc';

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paging, setPaging] = useState<{ before?: string; after?: string }>({});
  const workspaceId = typeof window !== 'undefined' ? localStorage.getItem('workspaceId') : null;

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    loadAccounts();
  }, [workspaceId]);

  useEffect(() => {
    if (selectedAccount) {
      loadPosts();
    }
  }, [selectedAccount]);

  const loadAccounts = async () => {
    try {
      const res = await get(`/threads/me/accounts?workspaceId=${workspaceId}`);
      if (res.success) {
        const accs = res.data as any[];
        setAccounts(accs);
        if (accs.length > 0) setSelectedAccount(accs[0].id);
      }
    } catch (err) {
      console.error('Failed to load accounts', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    if (!selectedAccount) return;
    setLoading(true);
    try {
      const res = await get(`/threads/me/posts?accountId=${selectedAccount}&limit=50`);
      if (res.success) {
        let data = res.data as Post[];

        if (dateFrom) {
          data = data.filter((p) => p.publishedAt && new Date(p.publishedAt) >= new Date(dateFrom));
        }
        if (dateTo) {
          data = data.filter((p) => p.publishedAt && new Date(p.publishedAt) <= new Date(dateTo));
        }

        data.sort((a, b) => {
          const aVal = getSortValue(a, sortKey);
          const bVal = getSortValue(b, sortKey);
          return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
        });

        setPosts(data);
        setPaging((res.meta as any)?.paging || {});
      }
    } catch (err) {
      console.error('Failed to load posts', err);
    } finally {
      setLoading(false);
    }
  };

  const getSortValue = (post: Post, key: SortKey): number => {
    const metric = post.metrics?.[0];
    switch (key) {
      case 'likes':
        return metric?.likes || 0;
      case 'replies':
        return metric?.replies || 0;
      case 'reposts':
        return (metric?.reposts || 0) + (metric?.quotes || 0);
      case 'views':
        return metric?.views || 0;
      case 'timestamp':
        return post.publishedAt ? new Date(post.publishedAt).getTime() : 0;
      default:
        return 0;
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const getEngagementTotal = (post: Post) => {
    const metric = post.metrics?.[0];
    return (
      (metric?.likes || 0) +
      (metric?.replies || 0) +
      (metric?.quotes || 0) +
      (metric?.reposts || 0) +
      (metric?.shares || 0)
    );
  };

  const getThumbnail = (post: Post): string | null => {
    if (post.thumbnailUrl) return post.thumbnailUrl;
    if (post.gifUrl) return post.gifUrl;
    if (post.mediaType === 'IMAGE' && post.rawPayload?.media_url) return post.rawPayload.media_url;
    if (post.mediaType === 'VIDEO' && post.rawPayload?.thumbnail_url) return post.rawPayload.thumbnail_url;
    return null;
  };

  const getMediaTypeIcon = (mediaType: string | null) => {
    switch (mediaType) {
      case 'TEXT_POST': return '📝';
      case 'IMAGE': return '🖼️';
      case 'VIDEO': return '🎬';
      case 'CAROUSEL_ALBUM': return '🎠';
      case 'AUDIO': return '🎵';
      case 'REPOST_FACADE': return '🔄';
      default: return '📄';
    }
  };

  const truncateText = (text: string | null, maxLen: number = 120) => {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
  };

  const SortHeader = ({ label, sortKeyVal }: { label: string; sortKeyVal: SortKey }) => (
    <th
      className="cursor-pointer px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
      onClick={() => handleSort(sortKeyVal)}
    >
      {label} {sortKey === sortKeyVal ? (sortDir === 'desc' ? '↓' : '↑') : ''}
    </th>
  );

  if (!workspaceId) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">Posts</h1>
        <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-700">
          No workspace selected.
        </div>
      </div>
    );
  }

  if (accounts.length === 0 && !loading) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">Posts</h1>
        <div className="rounded-md bg-gray-50 p-6 text-sm text-gray-500">
          Connect a Threads account to see your posts.{' '}
          <a href="/dashboard/profile" className="text-blue-600 hover:underline">
            Go to Profile
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Posts</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              @{acc.username}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="To date"
        />

        <button
          onClick={() => loadPosts()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Apply Filters
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading posts...</div>
      ) : posts.length === 0 ? (
        <div className="rounded-md bg-gray-50 p-6 text-center text-sm text-gray-500">
          No posts found. Click &quot;Refresh&quot; on the Profile page to fetch posts from Meta API.
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const thumbnail = getThumbnail(post);
            const metric = post.metrics?.[0];
            return (
              <div key={post.id} className="rounded-lg border bg-white p-4 hover:bg-gray-50">
                <div className="flex gap-4">
                  {thumbnail && (
                    <div className="flex-shrink-0">
                      <img
                        src={thumbnail}
                        alt={post.altText || post.postText || ''}
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
                          {post.isQuotePost && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">Quote</span>
                          )}
                          {post.topicTag && (
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">#{post.topicTag}</span>
                          )}
                        </div>
                        {post.postText && (
                          <p className="mt-2 text-sm text-gray-800">
                            {truncateText(post.postText, 200)}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-400">
                          {post.publishedAt ? new Date(post.publishedAt).toLocaleString() : 'Unknown date'}
                        </p>
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
                      <span className="flex items-center gap-1">❤️ {metric?.likes ?? '—'}</span>
                      <span className="flex items-center gap-1">💬 {metric?.replies ?? '—'}</span>
                      <span className="flex items-center gap-1">🔄 {metric?.reposts ?? '—'}</span>
                      <span className="flex items-center gap-1">📊 {metric?.quotes ?? '—'}</span>
                      <span className="flex items-center gap-1">👁️ {metric?.views ?? '—'}</span>
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

      {posts.length > 0 && (
        <div className="mt-4 flex justify-between text-xs text-gray-400">
          <span>{posts.length} posts</span>
          <span>Source: Database (synced from Meta Threads API)</span>
        </div>
      )}
    </div>
  );
}
