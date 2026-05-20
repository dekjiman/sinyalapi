import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
import { AuditLogService } from '../../services/audit-log.service';
import { CryptoService } from '../../services/crypto.service';
import { CacheService } from '../../services/cache.service';

@Injectable()
export class ThreadsService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private cryptoService: CryptoService,
    private cacheService: CacheService,
  ) {}

  async handleOAuthCallback(code: string, workspaceId: string, userId: string) {
    // TODO: Exchange code for access token via Meta API
    // POST https://graph.threads.net/oauth/access_token
    return { success: true, message: 'OAuth callback handler - implement Meta API integration' };
  }

  async getProfile(threadsAccountId: string) {
    const cacheKey = `threads:profile:${threadsAccountId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // TODO: Fetch from Meta Threads API
    const profile = { message: 'Profile fetch - implement Meta API integration' };

    await this.cacheService.set(cacheKey, profile, 900); // 15 minutes
    return profile;
  }

  async getPosts(threadsAccountId: string) {
    const cacheKey = `threads:posts:${threadsAccountId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // TODO: Fetch from Meta Threads API
    const posts = { message: 'Posts fetch - implement Meta API integration' };

    await this.cacheService.set(cacheKey, posts, 900);
    return posts;
  }

  async getInsights(threadsAccountId: string, postId: string) {
    // TODO: Fetch from Meta Threads API
    return { message: 'Insights fetch - implement Meta API integration' };
  }

  async disconnectAccount(threadsAccountId: string, userId: string) {
    await this.prisma.socialAccount.update({
      where: { id: threadsAccountId },
      data: {
        connectionStatus: 'disconnected',
        accessToken: null,
        tokenExpiresAt: null,
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'THREADS_DISCONNECT',
      entityType: 'social_account',
      entityId: threadsAccountId,
    });

    return { success: true };
  }
}
