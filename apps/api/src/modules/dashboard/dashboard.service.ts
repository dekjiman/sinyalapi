import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
import { CacheService } from '../../services/cache.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async getOverview(workspaceId: string) {
    const cacheKey = `dashboard:overview:${workspaceId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const [totalPosts, totalKeywords, totalCompetitors] = await Promise.all([
      this.prisma.socialPost.count({ where: { workspaceId } }),
      this.prisma.monitoredKeyword.count({ where: { workspaceId, isActive: true } }),
      this.prisma.monitoredCompetitor.count({ where: { workspaceId, isActive: true } }),
    ]);

    const overview = {
      totalPosts,
      totalKeywords,
      totalCompetitors,
      lastUpdatedAt: new Date().toISOString(),
    };

    await this.cacheService.set(cacheKey, overview, 600); // 10 minutes
    return overview;
  }
}
