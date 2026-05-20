import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AnalyticsService } from './analytics.service';
import { JwtGuard } from '../../guards/jwt.guard';
import { createSuccessResponse } from '@/types';

@Controller('dashboard')
@UseGuards(JwtGuard)
export class DashboardController {
  constructor(
    private dashboardService: DashboardService,
    private analyticsService: AnalyticsService,
  ) {}

  @Get('overview')
  async getOverview(@Query('workspaceId') workspaceId: string) {
    const data = await this.dashboardService.getOverview(workspaceId);
    return createSuccessResponse(data);
  }

  @Get('analytics/overview')
  async getAnalyticsOverview(
    @Query('workspaceId') workspaceId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const data = await this.analyticsService.getOverview(workspaceId, dateFrom, dateTo);
    return createSuccessResponse(data);
  }

  @Get('analytics/trends')
  async getTrends(
    @Query('workspaceId') workspaceId: string,
    @Query('days') days?: string,
  ) {
    const data = await this.analyticsService.getTrends(workspaceId, parseInt(days || '30', 10));
    return createSuccessResponse(data);
  }

  @Get('analytics/benchmark')
  async getBenchmark(@Query('workspaceId') workspaceId: string) {
    const data = await this.analyticsService.getCompetitorBenchmark(workspaceId);
    return createSuccessResponse(data);
  }

  @Get('analytics/insights')
  async getInsights(@Query('workspaceId') workspaceId: string) {
    const data = await this.analyticsService.getListeningInsights(workspaceId);
    return createSuccessResponse(data);
  }

  @Get('analytics/full')
  async getFullDashboard(
    @Query('workspaceId') workspaceId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('accountId') accountId?: string,
    @Query('keyword') keyword?: string,
    @Query('competitor') competitor?: string,
    @Query('sentiment') sentiment?: string,
    @Query('source') source?: string,
  ) {
    const data = await this.analyticsService.getFullDashboard(workspaceId, {
      dateFrom,
      dateTo,
      accountId,
      keyword,
      competitor,
      sentiment,
      source,
    });
    return createSuccessResponse(data);
  }
}
