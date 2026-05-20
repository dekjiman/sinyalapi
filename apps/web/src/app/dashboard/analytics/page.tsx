'use client';

import { useEffect, useState } from 'react';
import { get } from '@/lib/api-client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [benchmark, setBenchmark] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const workspaceId = typeof window !== 'undefined' ? localStorage.getItem('workspaceId') : null;

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    Promise.all([
      get(`/dashboard/analytics/overview?workspaceId=${workspaceId}`),
      get(`/dashboard/analytics/trends?workspaceId=${workspaceId}&days=30`),
      get(`/dashboard/analytics/benchmark?workspaceId=${workspaceId}`),
      get(`/dashboard/analytics/insights?workspaceId=${workspaceId}`),
    ])
      .then(([overviewRes, trendsRes, benchmarkRes, insightsRes]) => {
        if (overviewRes.success) setOverview(overviewRes.data);
        if (trendsRes.success) setTrends(trendsRes.data);
        if (benchmarkRes.success) setBenchmark((benchmarkRes.data as any[]) || []);
        if (insightsRes.success) setInsights(insightsRes.data);
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">Analytics</h1>
        <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-700">
          No workspace selected.
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading analytics...</div>;
  }

  const sentimentData = overview?.sentimentSplit
    ? [
        { name: 'Positive', value: overview.sentimentSplit.positive },
        { name: 'Neutral', value: overview.sentimentSplit.neutral },
        { name: 'Negative', value: overview.sentimentSplit.negative },
      ]
    : [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Analytics</h1>

      {/* Overview Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Total Posts</p>
          <p className="mt-2 text-3xl font-bold">{overview?.totalPosts || 0}</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Total Engagement</p>
          <p className="mt-2 text-3xl font-bold">{overview?.totalEngagement || 0}</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Avg Engagement Rate</p>
          <p className="mt-2 text-3xl font-bold">{overview?.avgEngagementRate || 0}%</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Total Mentions</p>
          <p className="mt-2 text-3xl font-bold">{overview?.totalMentions || 0}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {/* Posts Trend */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Posts Trend (30 days)</h2>
          {trends?.posts && trends.posts.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trends.posts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="posts" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">No data available</p>
          )}
        </div>

        {/* Engagement Trend */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Engagement Trend (30 days)</h2>
          {trends?.engagement && trends.engagement.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trends.engagement}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="engagement" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">No data available</p>
          )}
        </div>

        {/* Sentiment Distribution */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Sentiment Distribution</h2>
          {sentimentData.length > 0 && sentimentData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sentimentData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">No sentiment data</p>
          )}
        </div>

        {/* Mentions Trend */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Mentions Trend (30 days)</h2>
          {trends?.mentions && trends.mentions.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={trends.mentions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="mentions" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">No data available</p>
          )}
        </div>
      </div>

      {/* Competitor Benchmark */}
      {benchmark.length > 0 && (
        <div className="mb-6 rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Competitor Benchmark</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Competitor
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Posts
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Total Engagement
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Avg Engagement
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Avg Replies
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Avg Reposts
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {benchmark.map((b) => (
                  <tr key={b.username} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium">@{b.username}</td>
                    <td className="px-4 py-2 text-sm">{b.totalPosts}</td>
                    <td className="px-4 py-2 text-sm">{b.totalEngagement}</td>
                    <td className="px-4 py-2 text-sm">{b.avgEngagement}</td>
                    <td className="px-4 py-2 text-sm">{b.avgReplies}</td>
                    <td className="px-4 py-2 text-sm">{b.avgReposts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Listening Insights */}
      {insights && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Top Authors</h2>
            {insights.topAuthors && insights.topAuthors.length > 0 ? (
              <ul className="space-y-2">
                {insights.topAuthors.slice(0, 5).map((a: any, i: number) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span>@{a.username}</span>
                    <span className="text-gray-500">{a.count} posts</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No data</p>
            )}
          </div>

          <div className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Topic Distribution</h2>
            {insights.topicDistribution && insights.topicDistribution.length > 0 ? (
              <ul className="space-y-2">
                {insights.topicDistribution.slice(0, 5).map((t: any, i: number) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span>{t.topic}</span>
                    <span className="text-gray-500">{t.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No data</p>
            )}
          </div>
        </div>
      )}

      {overview?.lastUpdatedAt && (
        <p className="mt-6 text-xs text-gray-400">
          Last updated: {new Date(overview.lastUpdatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
