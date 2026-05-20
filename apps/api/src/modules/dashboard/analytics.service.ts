import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
import { CacheService } from '../../services/cache.service';

export interface AnalyticsOverview {
  totalPosts: number;
  totalEngagement: number;
  avgEngagementRate: number;
  totalMentions: number;
  topKeyword: string | null;
  topHashtag: string | null;
  sentimentSplit: { positive: number; neutral: number; negative: number };
  lastUpdatedAt: string;
}

export interface TrendDataPoint {
  date: string;
  posts: number;
  engagement: number;
  mentions: number;
}

export interface CompetitorBenchmark {
  username: string;
  totalPosts: number;
  totalEngagement: number;
  avgEngagement: number;
  avgReplies: number;
  avgReposts: number;
  topPost: {
    id: string;
    text: string | null;
    engagement: number;
  } | null;
}

export interface ListeningInsight {
  topKeywords: { keyword: string; count: number }[];
  topHashtags: { hashtag: string; count: number }[];
  topAuthors: { username: string; count: number }[];
  topicDistribution: { topic: string; count: number }[];
  sentimentDistribution: { sentiment: string; count: number }[];
}

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async getOverview(workspaceId: string, dateFrom?: string, dateTo?: string): Promise<AnalyticsOverview> {
    const cacheKey = `analytics:overview:${workspaceId}:${dateFrom || ''}:${dateTo || ''}`;
    const cached = await this.cacheService.get<AnalyticsOverview>(cacheKey);
    if (cached) return cached;

    const dateFilter: any = {};
    if (dateFrom || dateTo) {
      dateFilter.publishedAt = {};
      if (dateFrom) dateFilter.publishedAt.gte = new Date(dateFrom);
      if (dateTo) dateFilter.publishedAt.lte = new Date(dateTo);
    }

    const [totalPosts, totalKeywords, totalCompetitors] = await Promise.all([
      this.prisma.socialPost.count({ where: { workspaceId, ...dateFilter } }),
      this.prisma.monitoredKeyword.count({ where: { workspaceId, isActive: true } }),
      this.prisma.monitoredCompetitor.count({ where: { workspaceId, isActive: true } }),
    ]);

    const metrics = await this.prisma.postMetric.findMany({
      where: {
        post: {
          workspaceId,
          ...(dateFilter.publishedAt ? { publishedAt: dateFilter.publishedAt } : {}),
        },
      },
      select: {
        likes: true,
        replies: true,
        reposts: true,
        quotes: true,
        shares: true,
        views: true,
        engagementTotal: true,
        engagementRate: true,
      },
    });

    let totalEngagement = 0;
    let totalEngagementRate = 0;
    let validRates = 0;

    for (const m of metrics) {
      totalEngagement += m.engagementTotal || 0;
      if (m.engagementRate) {
        totalEngagementRate += Number(m.engagementRate);
        validRates++;
      }
    }

    const avgEngagementRate = validRates > 0 ? totalEngagementRate / validRates : 0;

    const classifications = await this.prisma.postClassification.groupBy({
      by: ['sentiment'],
      where: {
        post: {
          workspaceId,
          ...(dateFilter.publishedAt ? { publishedAt: dateFilter.publishedAt } : {}),
        },
      },
      _count: true,
    });

    const sentimentSplit = { positive: 0, neutral: 0, negative: 0 };
    for (const c of classifications) {
      if (c.sentiment === 'positive') sentimentSplit.positive = c._count;
      else if (c.sentiment === 'neutral' || c.sentiment === 'informational') sentimentSplit.neutral = c._count;
      else if (c.sentiment === 'negative' || c.sentiment === 'critical') sentimentSplit.negative = c._count;
    }

    const overview: AnalyticsOverview = {
      totalPosts,
      totalEngagement,
      avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
      totalMentions: totalPosts,
      topKeyword: null,
      topHashtag: null,
      sentimentSplit,
      lastUpdatedAt: new Date().toISOString(),
    };

    await this.cacheService.set(cacheKey, overview, 600);
    return overview;
  }

  async getTrends(
    workspaceId: string,
    days: number = 30,
  ): Promise<{ posts: TrendDataPoint[]; engagement: TrendDataPoint[]; mentions: TrendDataPoint[] }> {
    const cacheKey = `analytics:trends:${workspaceId}:${days}`;
    const cached = await this.cacheService.get<{ posts: TrendDataPoint[]; engagement: TrendDataPoint[]; mentions: TrendDataPoint[] }>(cacheKey);
    if (cached) return cached;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const posts = await this.prisma.socialPost.findMany({
      where: {
        workspaceId,
        publishedAt: { gte: startDate },
      },
      select: {
        publishedAt: true,
        id: true,
      },
      orderBy: { publishedAt: 'asc' },
    });

    const metrics = await this.prisma.postMetric.findMany({
      where: {
        post: {
          workspaceId,
          publishedAt: { gte: startDate },
        },
      },
      select: {
        postId: true,
        engagementTotal: true,
      },
    });

    const metricMap = new Map<string, number>();
    for (const m of metrics) {
      metricMap.set(m.postId, m.engagementTotal || 0);
    }

    const dailyData = new Map<string, { posts: number; engagement: number; mentions: number }>();

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const key = date.toISOString().split('T')[0];
      dailyData.set(key, { posts: 0, engagement: 0, mentions: 0 });
    }

    for (const post of posts) {
      if (!post.publishedAt) continue;
      const key = post.publishedAt.toISOString().split('T')[0];
      const existing = dailyData.get(key);
      if (existing) {
        existing.posts += 1;
        existing.mentions += 1;
        existing.engagement += metricMap.get(post.id) || 0;
      }
    }

    const postsTrend: TrendDataPoint[] = [];
    const engagementTrend: TrendDataPoint[] = [];
    const mentionsTrend: TrendDataPoint[] = [];

    for (const [date, data] of dailyData.entries()) {
      postsTrend.push({ date, posts: data.posts, engagement: 0, mentions: 0 });
      engagementTrend.push({ date, posts: 0, engagement: data.engagement, mentions: 0 });
      mentionsTrend.push({ date, posts: 0, engagement: 0, mentions: data.mentions });
    }

    const result = { posts: postsTrend, engagement: engagementTrend, mentions: mentionsTrend };
    await this.cacheService.set(cacheKey, result, 600);
    return result;
  }

  async getCompetitorBenchmark(workspaceId: string): Promise<CompetitorBenchmark[]> {
    const cacheKey = `analytics:benchmark:${workspaceId}`;
    const cached = await this.cacheService.get<CompetitorBenchmark[]>(cacheKey);
    if (cached) return cached;

    const competitors = await this.prisma.monitoredCompetitor.findMany({
      where: { workspaceId, isActive: true },
    });

    const benchmarks: CompetitorBenchmark[] = [];

    for (const competitor of competitors) {
      const posts = await this.prisma.socialPost.findMany({
        where: {
          workspaceId,
          authorUsername: competitor.username,
        },
        include: {
          metrics: true,
        },
      });

      let totalEngagement = 0;
      let totalReplies = 0;
      let totalReposts = 0;
      let topPost: CompetitorBenchmark['topPost'] = null;

      for (const post of posts) {
        const postEngagement = post.metrics.reduce((sum, m) => sum + (m.engagementTotal || 0), 0);
        totalEngagement += postEngagement;
        totalReplies += post.metrics.reduce((sum, m) => sum + (m.replies || 0), 0);
        totalReposts += post.metrics.reduce((sum, m) => sum + (m.reposts || 0) + (m.quotes || 0), 0);

        if (!topPost || postEngagement > topPost.engagement) {
          topPost = {
            id: post.id,
            text: post.postText,
            engagement: postEngagement,
          };
        }
      }

      benchmarks.push({
        username: competitor.username,
        totalPosts: posts.length,
        totalEngagement,
        avgEngagement: posts.length > 0 ? Math.round((totalEngagement / posts.length) * 100) / 100 : 0,
        avgReplies: posts.length > 0 ? Math.round((totalReplies / posts.length) * 100) / 100 : 0,
        avgReposts: posts.length > 0 ? Math.round((totalReposts / posts.length) * 100) / 100 : 0,
        topPost,
      });
    }

    await this.cacheService.set(cacheKey, benchmarks, 600);
    return benchmarks;
  }

  async getListeningInsights(workspaceId: string): Promise<ListeningInsight> {
    const cacheKey = `analytics:listening:${workspaceId}`;
    const cached = await this.cacheService.get<ListeningInsight>(cacheKey);
    if (cached) return cached;

    const keywords = await this.prisma.monitoredKeyword.findMany({
      where: { workspaceId, isActive: true },
      select: { queryString: true },
    });

    const topKeywords = keywords.slice(0, 10).map((k) => ({
      keyword: k.queryString,
      count: 0,
    }));

    const classifications = await this.prisma.postClassification.groupBy({
      by: ['sentiment', 'topic'],
      where: {
        post: { workspaceId },
      },
      _count: true,
      orderBy: { _count: { sentiment: 'desc' } },
    });

    const sentimentDistribution = classifications
      .filter((c) => c.sentiment)
      .map((c) => ({ sentiment: c.sentiment!, count: c._count }));

    const topicDistribution = classifications
      .filter((c) => c.topic)
      .map((c) => ({ topic: c.topic!, count: c._count }));

    const topAuthors = await this.prisma.socialPost.groupBy({
      by: ['authorUsername'],
      where: { workspaceId, authorUsername: { not: null } },
      _count: true,
      orderBy: { _count: { authorUsername: 'desc' } },
      take: 10,
    });

    const insights: ListeningInsight = {
      topKeywords,
      topHashtags: [],
      topAuthors: topAuthors
        .filter((a) => a.authorUsername)
        .map((a) => ({ username: a.authorUsername!, count: a._count })),
      topicDistribution,
      sentimentDistribution,
    };

    await this.cacheService.set(cacheKey, insights, 600);
    return insights;
  }

  async getFullDashboard(
    workspaceId: string,
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      accountId?: string;
      keyword?: string;
      competitor?: string;
      sentiment?: string;
      source?: string;
    },
  ) {
    const cacheKey = `analytics:full:${workspaceId}:${JSON.stringify(filters || {})}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const [overview, trends, benchmarks, insights] = await Promise.all([
      this.getOverview(workspaceId, filters?.dateFrom, filters?.dateTo),
      this.getTrends(workspaceId, 30),
      this.getCompetitorBenchmark(workspaceId),
      this.getListeningInsights(workspaceId),
    ]);

    const result = { overview, trends, benchmarks, insights };
    await this.cacheService.set(cacheKey, result, 600);
    return result;
  }
}
