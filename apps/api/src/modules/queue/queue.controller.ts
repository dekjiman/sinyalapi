import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { QueueService } from './queue.service';
import { JwtGuard } from '../../guards/jwt.guard';
import { createSuccessResponse } from '@/types';

@Controller('queue')
@UseGuards(JwtGuard)
export class QueueController {
  constructor(private queueService: QueueService) {}

  @Post('jobs')
  async createJob(@Body() body: { workspaceId: string; jobType: string; queryReferenceId?: string }) {
    const data = await this.queueService.createJob(body);
    return createSuccessResponse(data);
  }

  @Get('jobs')
  async getJobs(@Query('workspaceId') workspaceId: string, @Query('limit') limit?: string) {
    const data = await this.queueService.getJobs(workspaceId, parseInt(limit || '50', 10));
    return createSuccessResponse(data);
  }

  @Get('stats')
  async getStats(@Query('workspaceId') workspaceId: string) {
    const data = await this.queueService.getJobStats(workspaceId);
    return createSuccessResponse(data);
  }
}
