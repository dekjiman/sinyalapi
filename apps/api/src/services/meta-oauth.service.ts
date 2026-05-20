import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { CryptoService } from './crypto.service';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class MetaOAuthService {
  private readonly baseUrl = 'https://graph.threads.net';
  private readonly authUrl = 'https://threads.net/oauth/authorize';

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private cryptoService: CryptoService,
    private auditLogService: AuditLogService,
  ) {}

  getAuthUrl(state: string): string {
    const appId = this.configService.get<string>('META_APP_ID') || '1833589200894813';
    const redirectUri = this.configService.get<string>('META_REDIRECT_URI') || 'https://sinyalapi.co/api/v1/threads/oauth/callback';
    const scopes = 'threads_basic,threads_content_publish,threads_manage_insights,threads_manage_replies,threads_read_replies,threads_delete,threads_keyword_search,threads_location_tagging,threads_manage_mentions,threads_profile_discovery,threads_share_to_instagram';
  
    return `${this.authUrl}?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scopes)}&response_type=code`;
  }

  async exchangeCodeForToken(code: string): Promise<{
    accessToken: string;
    userId: string;
    expiresIn: number;
  }> {
    const appId = this.configService.get<string>('META_APP_ID') || '1833589200894813';
    const appSecret = this.configService.get<string>('META_APP_SECRET') || '0e34ae0e4e2105c4112c12216490cd48';
    const redirectUri = this.configService.get<string>('META_REDIRECT_URI') || 'https://sinyalapi.co/api/v1/threads/oauth/callback';

    const response = await fetch(`${this.baseUrl}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Meta OAuth failed: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      userId: data.user_id,
      expiresIn: data.expires_in,
    };
  }

  async getLongLivedToken(shortLivedToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    const appSecret = this.configService.get<string>('META_APP_SECRET') || '0e34ae0e4e2105c4112c12216490cd48';

    const response = await fetch(`${this.baseUrl}/access_token?grant_type=th_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}&fields=access_token,expires_in`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to exchange long-lived token: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  }

  async getUserProfile(accessToken: string): Promise<{
    id: string;
    username: string;
    name?: string;
    threads_profile_picture_url?: string;
    threads_biography?: string;
    is_verified?: boolean;
  }> {
    const response = await fetch(`${this.baseUrl}/me?fields=id,username,name,threads_profile_picture_url,threads_biography,is_verified&access_token=${accessToken}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to fetch profile: ${error.error?.message || 'Unknown error'}`);
    }

    return response.json();
  }

  async getFollowersCount(accessToken: string): Promise<number | null> {
    try {
      const response = await fetch(`${this.baseUrl}/me/threads_insights?metric=followers_count&access_token=${accessToken}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.data?.[0]?.total_value?.value || null;
    } catch {
      return null;
    }
  }

  async handleCallback(code: string, workspaceId: string, userId: string) {
    const { accessToken, userId: platformUserIdRaw, expiresIn } = await this.exchangeCodeForToken(code);
    const platformUserId = String(platformUserIdRaw);
    
    const longLived = await this.getLongLivedToken(accessToken);
    const profile = await this.getUserProfile(longLived.accessToken);
    const followersCount = await this.getFollowersCount(longLived.accessToken);

    const tokenExpiresAt = new Date(Date.now() + longLived.expiresIn * 1000);

    const account = await this.prisma.socialAccount.upsert({
      where: {
        workspaceId_platform_platformUserId: {
          workspaceId,
          platform: 'threads',
          platformUserId,
        },
      },
      update: {
        accessToken: longLived.accessToken,
        tokenExpiresAt,
        connectionStatus: 'active',
        username: profile.username,
        displayName: profile.name,
        biography: profile.threads_biography,
        profilePictureUrl: profile.threads_profile_picture_url,
        isVerified: profile.is_verified || false,
        followersCount,
        lastSyncedAt: new Date(),
      },
      create: {
        workspaceId,
        connectedByUserId: userId,
        platform: 'threads',
        platformUserId,
        username: profile.username,
        displayName: profile.name,
        biography: profile.threads_biography,
        profilePictureUrl: profile.threads_profile_picture_url,
        isVerified: profile.is_verified || false,
        followersCount,
        accessToken: longLived.accessToken,
        tokenExpiresAt,
        connectionStatus: 'active',
        lastSyncedAt: new Date(),
      },
    });

    await this.auditLogService.log({
      workspaceId,
      userId,
      action: 'THREADS_CONNECTED',
      entityType: 'social_account',
      entityId: account.id,
      metadata: { platform: 'threads', platformUserId, username: profile.username },
    });

    return account;
  }
}
