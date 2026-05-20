import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { JwtGuard } from '../../guards/jwt.guard';

@Controller('monitoring')
@UseGuards(JwtGuard)
export class MonitoringController {
  constructor(private monitoringService: MonitoringService) {}

  @Post('keywords')
  async createKeyword(@Body() body: any, @Request() req: any) {
    const keyword = await this.monitoringService.createKeyword({
      ...body,
      createdByUserId: req.user.id,
    });
    return { success: true, data: keyword };
  }

  @Get('keywords')
  async getKeywords(@Query('workspaceId') workspaceId: string) {
    const keywords = await this.monitoringService.getKeywords(workspaceId);
    return { success: true, data: keywords };
  }

  @Post('competitors')
  async createCompetitor(@Body() body: any, @Request() req: any) {
    const competitor = await this.monitoringService.createCompetitor({
      ...body,
      workspaceId: body.workspaceId,
    });
    return { success: true, data: competitor };
  }

  @Get('competitors')
  async getCompetitors(@Query('workspaceId') workspaceId: string) {
    const competitors = await this.monitoringService.getCompetitors(workspaceId);
    return { success: true, data: competitors };
  }

  @Get('search/keyword')
  async searchKeyword(@Query('q') query: string, @Query('workspaceId') workspaceId: string) {
    return this.monitoringService.searchKeyword(query, workspaceId);
  }

  @Get('search/user/:username')
  async searchCompetitor(@Param('username') username: string, @Query('workspaceId') workspaceId: string) {
    return this.monitoringService.searchCompetitor(username, workspaceId);
  }
}
