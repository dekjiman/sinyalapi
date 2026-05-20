import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { CryptoService } from './crypto.service';
import { CacheService } from './cache.service';
import { AuditLogService } from './audit-log.service';

export interface ThreadsProfile {
  id: string;
  username: string;
  threads_profile_picture_url?: string;
  display_name?: string;
}

export interface ThreadsMedia {
  id: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  caption?: string;
  username: string;
  like_count?: number;
  reply_count?: number;
  quote_count?: number;
  repost_count?: number;
  view_count?: number;
  share_count?: number;
}

export interface ThreadsInsight {
  name: string;
  values: { value: number }[];
  total_value?: { value: number };
}

@Injectable()
export class ThreadsApiService {
  private readonly baseUrl = 'https://graph.threads.net';

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private cryptoService: CryptoService,
    private cacheService: CacheService,
    private auditLogService: AuditLogService,
  ) {}

  private async getAccessToken(accountId: string): Promise<string> {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Social account not found');
    }

    if (account.connectionStatus !== 'active') {
      throw new BadRequestException('Social account is not connected');
    }

    if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
      await this.prisma.socialAccount.update({
        where: { id: accountId },
        data: { connectionStatus: 'expired' },
      });
      throw new BadRequestException('THREADS_TOKEN_EXPIRED');
    }

    if (!account.accessToken) {
      throw new BadRequestException('Access token not available');
    }

    return account.accessToken;
  }

  async getAccountsByWorkspace(workspaceId: string) {
    return this.prisma.socialAccount.findMany({
      where: { workspaceId, connectionStatus: 'active' },
      select: {
        id: true,
        platform: true,
        platformUserId: true,
        username: true,
        displayName: true,
        biography: true,
        profilePictureUrl: true,
        isVerified: true,
        followersCount: true,
        likesCount: true,
        quotesCount: true,
        repostsCount: true,
        viewsCount: true,
        connectionStatus: true,
        tokenExpiresAt: true,
        lastSyncedAt: true,
      },
    });
  }

  async getProfile(accountId: string): Promise<ThreadsProfile> {
    const cacheKey = `threads:profile:${accountId}`;
    const cached = await this.cacheService.get<ThreadsProfile>(cacheKey);
    if (cached) return cached;

    const accessToken = await this.getAccessToken(accountId);

    const response = await fetch(
      `${this.baseUrl}/me?fields=id,username,name,threads_profile_picture_url,threads_biography,is_verified&access_token=${accessToken}`,
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to fetch profile: ${error.error?.message || 'Unknown error'}`);
    }

    const profile = await response.json();

    await this.prisma.socialAccount.update({
      where: { id: accountId },
      data: {
        username: profile.username,
        displayName: profile.name,
        biography: profile.threads_biography,
        profilePictureUrl: profile.threads_profile_picture_url,
        isVerified: profile.is_verified || false,
        lastSyncedAt: new Date(),
      },
    });

    await this.cacheService.set(cacheKey, profile, 900);

    return profile;
  }

  async getMediaList(
    accountId: string,
    limit: number = 50,
    before?: string,
    after?: string,
  ): Promise<{ data: ThreadsMedia[]; paging: { before?: string; after?: string } }> {
    const cacheKey = `threads:media:${accountId}:${limit}:${before || ''}:${after || ''}`;
    const cached = await this.cacheService.get<{ data: ThreadsMedia[]; paging: { before?: string; after?: string } }>(cacheKey);
    if (cached) return cached;

    const accessToken = await this.getAccessToken(accountId);
    const account = await this.prisma.socialAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Social account not found');

    const fields = 'id,media_product_type,media_type,media_url,permalink,owner,username,text,timestamp,shortcode,thumbnail_url,children,is_quote_post,quoted_post,reposted_post,alt_text,link_attachment_url,gif_url,poll_attachment,topic_tag,is_spoiler_media,text_entities,text_attachment,ghost_post_status,ghost_post_expiration_timestamp,is_verified,profile_picture_url,like_count,reply_count,quote_count,repost_count,view_count,share_count';
    let url = `${this.baseUrl}/me/threads?fields=${fields}&limit=${limit}&access_token=${accessToken}`;

    if (before) url += `&before=${before}`;
    if (after) url += `&after=${after}`;

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to fetch media: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    const mediaList = data.data || [];
    const paging = data.paging || {};

    for (const media of mediaList) {
      await this.prisma.socialPost.upsert({
        where: {
          platform_externalPostId: {
            platform: 'threads',
            externalPostId: media.id,
          },
        },
        update: {
          authorUsername: media.username,
          postText: media.text,
          permalink: media.permalink,
          mediaType: media.media_type,
          mediaProductType: media.media_product_type,
          publishedAt: new Date(media.timestamp),
          shortcode: media.shortcode,
          thumbnailUrl: media.thumbnail_url,
          children: media.children,
          isQuotePost: media.is_quote_post,
          quotedPost: media.quoted_post,
          repostedPost: media.reposted_post,
          altText: media.alt_text,
          linkAttachmentUrl: media.link_attachment_url,
          gifUrl: media.gif_url,
          pollAttachment: media.poll_attachment,
          topicTag: media.topic_tag,
          isSpoilerMedia: media.is_spoiler_media,
          textEntities: media.text_entities,
          textAttachment: media.text_attachment,
          ghostPostStatus: media.ghost_post_status,
          ghostPostExpirationTs: media.ghost_post_expiration_timestamp ? new Date(media.ghost_post_expiration_timestamp) : null,
          isVerified: media.is_verified,
          authorProfilePictureUrl: media.profile_picture_url,
          ownerId: media.owner?.id,
          rawPayload: media,
        },
        create: {
          workspaceId: account.workspaceId,
          platform: 'threads',
          socialAccountId: accountId,
          externalPostId: media.id,
          authorUsername: media.username,
          postText: media.text,
          permalink: media.permalink,
          mediaType: media.media_type,
          mediaProductType: media.media_product_type,
          publishedAt: new Date(media.timestamp),
          source: 'meta_threads_api',
          shortcode: media.shortcode,
          thumbnailUrl: media.thumbnail_url,
          children: media.children,
          isQuotePost: media.is_quote_post,
          quotedPost: media.quoted_post,
          repostedPost: media.reposted_post,
          altText: media.alt_text,
          linkAttachmentUrl: media.link_attachment_url,
          gifUrl: media.gif_url,
          pollAttachment: media.poll_attachment,
          topicTag: media.topic_tag,
          isSpoilerMedia: media.is_spoiler_media,
          textEntities: media.text_entities,
          textAttachment: media.text_attachment,
          ghostPostStatus: media.ghost_post_status,
          ghostPostExpirationTs: media.ghost_post_expiration_timestamp ? new Date(media.ghost_post_expiration_timestamp) : null,
          isVerified: media.is_verified,
          authorProfilePictureUrl: media.profile_picture_url,
          ownerId: media.owner?.id,
          rawPayload: media,
        },
      });

      if (media.like_count !== undefined || media.reply_count !== undefined) {
        const engagementTotal =
          (media.like_count || 0) +
          (media.reply_count || 0) +
          (media.quote_count || 0) +
          (media.repost_count || 0) +
          (media.share_count || 0);

        const followersCount = account.followersCount || 0;
        const engagementRate = followersCount > 0 ? (engagementTotal / followersCount) * 100 : 0;

        await this.prisma.postMetric.upsert({
          where: { postId: media.id } as any,
          update: {
            likes: media.like_count,
            replies: media.reply_count,
            quotes: media.quote_count,
            reposts: media.repost_count,
            views: media.view_count,
            shares: media.share_count,
            engagementTotal,
            engagementRate,
          },
          create: {
            postId: media.id,
            likes: media.like_count,
            replies: media.reply_count,
            quotes: media.quote_count,
            reposts: media.repost_count,
            views: media.view_count,
            shares: media.share_count,
            engagementTotal,
            engagementRate,
          },
        });
      }
    }

    await this.prisma.socialAccount.update({
      where: { id: accountId },
      data: { lastSyncedAt: new Date() },
    });

    const result = {
      data: mediaList,
      paging: {
        before: paging.cursors?.before,
        after: paging.cursors?.after,
      },
    };

    await this.cacheService.set(cacheKey, result, 900);

    return result;
  }

  async getMediaInsights(accountId: string, mediaId: string): Promise<ThreadsInsight[]> {
    const accessToken = await this.getAccessToken(accountId);

    const response = await fetch(
      `${this.baseUrl}/${mediaId}/insights?metric=views,likes,replies,reposts,shares&access_token=${accessToken}`,
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to fetch insights: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  async refreshProfile(accountId: string): Promise<ThreadsProfile> {
    await this.cacheService.del(`threads:profile:${accountId}`);
    return this.getProfile(accountId);
  }

  async refreshMedia(accountId: string): Promise<any> {
    await this.cacheService.del(`threads:media:${accountId}`);
    return this.getMediaList(accountId);
  }

  async disconnectAccount(accountId: string, userId: string): Promise<{ success: boolean }> {
    await this.prisma.socialAccount.update({
      where: { id: accountId },
      data: {
        connectionStatus: 'disconnected',
        accessToken: null,
        tokenExpiresAt: null,
      },
    });

    await this.cacheService.del(`threads:profile:${accountId}`);
    await this.cacheService.del(`threads:media:${accountId}`);

    await this.auditLogService.log({
      userId,
      action: 'THREADS_DISCONNECT',
      entityType: 'social_account',
      entityId: accountId,
    });

    return { success: true };
  }
}
