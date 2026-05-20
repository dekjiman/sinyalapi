import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
import { AuditLogService } from '../../services/audit-log.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MonitoringService {
  private readonly threadsApiUrl = 'https://graph.threads.net';

  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private configService: ConfigService,
  ) {}

  private async getActiveToken(workspaceId: string): Promise<{ accessToken: string; threadsUserId: string } | null> {
    const account = await this.prisma.socialAccount.findFirst({
      where: { workspaceId, connectionStatus: 'active' },
      select: { id: true, accessToken: true, tokenExpiresAt: true, platformUserId: true },
    });
    if (!account || !account.accessToken) return null;
    if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
      await this.prisma.socialAccount.updateMany({
        where: { id: account.id },
        data: { connectionStatus: 'expired' },
      });
      return null;
    }
    return { accessToken: account.accessToken, threadsUserId: account.platformUserId || '' };
  }

  async createKeyword(data: {
    workspaceId: string;
    queryString: string;
    createdByUserId: string;
    includeTerms?: string[];
    excludeTerms?: string[];
    language?: string;
    country?: string;
    syncFrequency?: string;
  }): Promise<any> {
    const keyword = await this.prisma.monitoredKeyword.create({
      data: {
        workspaceId: data.workspaceId,
        queryString: data.queryString,
        includeTerms: data.includeTerms || undefined,
        excludeTerms: data.excludeTerms || undefined,
        language: data.language,
        country: data.country,
        syncFrequency: data.syncFrequency || 'manual',
        createdByUserId: data.createdByUserId,
      },
    });

    await this.auditLogService.log({
      workspaceId: data.workspaceId,
      userId: data.createdByUserId,
      action: 'KEYWORD_CREATED',
      entityType: 'monitored_keyword',
      entityId: keyword.id,
    });

    return keyword;
  }

  async getKeywords(workspaceId: string): Promise<any[]> {
    return this.prisma.monitoredKeyword.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCompetitor(data: {
    workspaceId: string;
    username: string;
    displayName?: string;
  }) {
    const competitor = await this.prisma.monitoredCompetitor.create({
      data: {
        workspaceId: data.workspaceId,
        username: data.username.replace(/^@/, ''),
        displayName: data.displayName,
      },
    });

    await this.auditLogService.log({
      workspaceId: data.workspaceId,
      action: 'COMPETITOR_CREATED',
      entityType: 'monitored_competitor',
      entityId: competitor.id,
    });

    return competitor;
  }

  async getCompetitors(workspaceId: string) {
    return this.prisma.monitoredCompetitor.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async searchKeyword(query: string, workspaceId?: string) {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Query parameter "q" is required');
    }

    if (!workspaceId) {
      return {
        success: false,
        error: 'Workspace ID is required',
        data: [],
      };
    }

    const tokenData = await this.getActiveToken(workspaceId);

    // Try Meta API first if token available
    if (tokenData) {
      try {
        const fields = 'id,media_product_type,media_type,media_url,permalink,username,text,timestamp,shortcode,thumbnail_url,is_quote_post,has_replies,is_reply,topic_tag,is_verified,profile_picture_url,like_count,reply_count,quote_count,repost_count,view_count,share_count';
        const url = `${this.threadsApiUrl}/keyword_search?q=${encodeURIComponent(query)}&search_type=TOP&fields=${fields}&limit=25&access_token=${tokenData.accessToken}`;
        const response = await fetch(url);

        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            return {
              success: true,
              data: data.data.map((d: any) => ({ ...d, source: 'meta_api' })),
              paging: data.paging || {},
              meta: { source: 'meta_api', count: data.data.length },
            };
          }
        }
      } catch (err: any) {
        console.log('[searchKeyword] Meta API failed, falling back to DB:', err.message);
      }
    }

    // Fallback to database search
    const dbResults = await this.searchKeywordFromDB(query, workspaceId);
    return {
      success: true,
      data: dbResults,
      meta: { source: 'local_db', count: dbResults.length },
    };
  }

  private async searchKeywordFromDB(query: string, workspaceId: string) {
    const lowerQuery = query.toLowerCase();
    const posts = await this.prisma.socialPost.findMany({
      where: {
        workspaceId,
        OR: [
          { postText: { contains: lowerQuery } },
          { topicTag: { contains: lowerQuery } },
          { authorUsername: { contains: lowerQuery } },
        ],
      },
      include: {
        metrics: {
          orderBy: { metricCollectedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: 25,
    });

    return posts.map((post: any) => ({
      id: post.id,
      username: post.authorUsername,
      text: post.postText,
      mediaType: post.mediaType,
      mediaProductType: post.mediaProductType,
      permalink: post.permalink,
      timestamp: post.publishedAt?.toISOString() || null,
      shortcode: post.shortcode,
      thumbnailUrl: post.thumbnailUrl,
      isQuotePost: post.isQuotePost,
      topicTag: post.topicTag,
      isVerified: post.isVerified,
      profilePictureUrl: post.authorProfilePictureUrl,
      likeCount: post.metrics?.[0]?.likes || null,
      replyCount: post.metrics?.[0]?.replies || null,
      quoteCount: post.metrics?.[0]?.quotes || null,
      repostCount: post.metrics?.[0]?.reposts || null,
      viewCount: post.metrics?.[0]?.views || null,
      shareCount: post.metrics?.[0]?.shares || null,
      source: 'local_db',
    }));
  }

  async searchCompetitor(username: string, workspaceId?: string) {
    if (!username || username.trim().length === 0) {
      throw new BadRequestException('Username is required');
    }

    const cleanUsername = username.replace(/^@/, '');

    const tokenData = workspaceId ? await this.getActiveToken(workspaceId) : null;
    if (!tokenData) {
      return {
        success: false,
        error: 'No active Threads account connected. Connect an account first.',
        data: null,
      };
    }

    try {
      const url = `${this.threadsApiUrl}/profile_lookup?username=${encodeURIComponent(cleanUsername)}&access_token=${tokenData.accessToken}`;
      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error?.message || 'User not found',
          data: null,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Search failed',
        data: null,
      };
    }
  }
}
