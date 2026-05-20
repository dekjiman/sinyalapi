import { Controller, Get, Post, Query, Param, UseGuards, Request, Redirect, HttpStatus, BadRequestException, Res } from '@nestjs/common';
import { Response } from 'express';
import { ThreadsApiService } from '../../services/threads-api.service';
import { MetaOAuthService } from '../../services/meta-oauth.service';
import { PrismaService } from '../../services/prisma.service';
import { JwtGuard } from '../../guards/jwt.guard';
import * as crypto from 'crypto';

@Controller('threads')
export class ThreadsController {
  constructor(
    private threadsApiService: ThreadsApiService,
    private metaOAuthService: MetaOAuthService,
    private prisma: PrismaService,
  ) {}

  @Get('oauth/start')
  @Redirect()
  async startOAuth(@Query('workspaceId') workspaceId: string) {
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }
    const state = crypto.randomBytes(16).toString('hex');
    const url = this.metaOAuthService.getAuthUrl(`${state}:${workspaceId}`);
    return { url, statusCode: HttpStatus.FOUND };
  }

  @Get('oauth/callback')
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    if (error) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Threads Connection Failed</title></head>
        <body style="font-family:system-ui,sans-serif;text-align:center;padding:40px;">
          <h2>Connection Failed</h2>
          <p style="color:#666;">${errorDescription || error}</p>
          <p style="color:#999;font-size:12px;">This window will close in 3 seconds...</p>
          <script>
            window.opener?.postMessage({ type: 'threads-oauth-complete', success: false, error: '${error}' }, '*');
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
        </html>
      `);
    }

    const [, workspaceId] = state.split(':');
    if (!workspaceId || !code) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Invalid Callback</title></head>
        <body style="font-family:system-ui,sans-serif;text-align:center;padding:40px;">
          <h2>Invalid Callback</h2>
          <p style="color:#666;">Missing authorization code or workspace ID.</p>
          <script>
            window.opener?.postMessage({ type: 'threads-oauth-complete', success: false, error: 'Missing code or workspaceId' }, '*');
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
        </html>
      `);
    }

    try {
      const account = await this.metaOAuthService.handleCallback(code, workspaceId, null as any);
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Threads Connected</title></head>
        <body style="font-family:system-ui,sans-serif;text-align:center;padding:40px;">
          <h2>✅ Threads Account Connected</h2>
          <p style="color:#666;">@${account.username}</p>
          <p style="color:#999;font-size:12px;">This window will close in 2 seconds...</p>
          <script>
            window.opener?.postMessage({ type: 'threads-oauth-complete', success: true, username: '${account.username}' }, '*');
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
        </html>
      `);
    } catch (err: any) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Connection Failed</title></head>
        <body style="font-family:system-ui,sans-serif;text-align:center;padding:40px;">
          <h2>❌ Connection Failed</h2>
          <p style="color:#666;">${err.message || 'Unknown error'}</p>
          <script>
            window.opener?.postMessage({ type: 'threads-oauth-complete', success: false, error: '${err.message?.replace(/'/g, "\\'")}' }, '*');
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
        </html>
      `);
    }
  }

  @UseGuards(JwtGuard)
  @Get('me/accounts')
  async getAccounts(@Query('workspaceId') workspaceId: string) {
    const accounts = await this.threadsApiService.getAccountsByWorkspace(workspaceId);
    return {
      success: true,
      data: accounts,
      meta: { source: 'database', cached: false, lastUpdatedAt: new Date().toISOString() },
      error: null,
    };
  }

  @UseGuards(JwtGuard)
  @Get('me/profile')
  async getProfile(@Query('accountId') accountId: string) {
    if (!accountId) throw new BadRequestException('accountId is required');
    const profile = await this.threadsApiService.getProfile(accountId);
    return {
      success: true,
      data: profile,
      meta: { source: 'meta_threads_api', cached: false, lastUpdatedAt: new Date().toISOString() },
      error: null,
    };
  }

  @UseGuards(JwtGuard)
  @Get('me/posts')
  async getPosts(
    @Query('accountId') accountId: string,
    @Query('limit') limit: string = '50',
    @Query('before') before?: string,
    @Query('after') after?: string,
  ) {
    if (!accountId) throw new BadRequestException('accountId is required');
    const result = await this.threadsApiService.getMediaList(accountId, parseInt(limit, 10), before, after);
    const posts = await this.prisma.socialPost.findMany({
      where: { socialAccountId: accountId },
      orderBy: { publishedAt: 'desc' },
      take: parseInt(limit, 10),
      select: {
        id: true,
        externalPostId: true,
        authorUsername: true,
        postText: true,
        permalink: true,
        mediaType: true,
        mediaProductType: true,
        publishedAt: true,
        shortcode: true,
        thumbnailUrl: true,
        isQuotePost: true,
        topicTag: true,
        isVerified: true,
        authorProfilePictureUrl: true,
        altText: true,
        gifUrl: true,
        linkAttachmentUrl: true,
        rawPayload: true,
        metrics: {
          select: {
            likes: true,
            replies: true,
            quotes: true,
            reposts: true,
            views: true,
            shares: true,
            engagementTotal: true,
            engagementRate: true,
          },
        },
      },
    });
    return {
      success: true,
      data: posts,
      meta: {
        source: 'database',
        cached: false,
        lastUpdatedAt: new Date().toISOString(),
        paging: result.paging,
      },
      error: null,
    };
  }

  @UseGuards(JwtGuard)
  @Get('me/insights/:mediaId')
  async getInsights(@Query('accountId') accountId: string, @Param('mediaId') mediaId: string) {
    if (!accountId) throw new BadRequestException('accountId is required');
    const insights = await this.threadsApiService.getMediaInsights(accountId, mediaId);
    return {
      success: true,
      data: insights,
      meta: { source: 'meta_threads_api', cached: false, lastUpdatedAt: new Date().toISOString() },
      error: null,
    };
  }

  @UseGuards(JwtGuard)
  @Post('me/refresh')
  async refresh(@Query('accountId') accountId: string) {
    if (!accountId) throw new BadRequestException('accountId is required');
    await this.threadsApiService.refreshProfile(accountId);
    await this.threadsApiService.refreshMedia(accountId);
    return { success: true, message: 'Data refreshed successfully' };
  }

  @UseGuards(JwtGuard)
  @Post('disconnect/:accountId')
  async disconnect(@Param('accountId') accountId: string, @Request() req: any) {
    return this.threadsApiService.disconnectAccount(accountId, req.user.id);
  }
}
