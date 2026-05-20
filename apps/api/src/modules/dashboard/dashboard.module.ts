import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AnalyticsService } from './analytics.service';
import { DashboardController } from './dashboard.controller';
import { PrismaService } from '../../services/prisma.service';
import { CacheService } from '../../services/cache.service';

@Module({
  providers: [DashboardService, AnalyticsService, PrismaService, CacheService],
  controllers: [DashboardController],
  exports: [DashboardService, AnalyticsService],
})
export class DashboardModule {}
