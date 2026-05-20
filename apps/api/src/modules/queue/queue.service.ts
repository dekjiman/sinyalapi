import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
import * as cron from 'node-cron';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private scheduledTasks: cron.ScheduledTask[] = [];

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    this.setupCronJobs();
  }

  onModuleDestroy() {
    for (const task of this.scheduledTasks) {
      task.stop();
    }
  }

  private setupCronJobs() {
    this.registerCron('0 */6 * * *', 'keyword_sync', 'Sync keywords every 6 hours');
    this.registerCron('0 2 * * *', 'competitor_sync', 'Sync competitors daily at 2 AM');
    this.registerCron('0 */12 * * *', 'owned_refresh', 'Refresh owned media every 12 hours');
    this.registerCron('0 3 * * *', 'cleanup_old_data', 'Cleanup old data daily at 3 AM');
    this.registerCron('*/30 * * * *', 'retry_failed_jobs', 'Retry failed jobs every 30 minutes');
  }

  private registerCron(expression: string, jobType: string, description: string) {
    const task = cron.schedule(expression, async () => {
      console.log(`[Cron] ${description} - Starting ${jobType}`);
      await this.runSyncJob(jobType);
    });
    this.scheduledTasks.push(task);
  }

  private async runSyncJob(jobType: string) {
    const workspaces = await this.prisma.workspace.findMany({
      select: { id: true },
    });

    for (const workspace of workspaces) {
      const job = await this.prisma.syncJob.create({
        data: {
          workspaceId: workspace.id,
          jobType,
          jobStatus: 'queued',
        },
      });

      try {
        await this.prisma.syncJob.update({
          where: { id: job.id },
          data: {
            jobStatus: 'running',
            startedAt: new Date(),
          },
        });

        await this.executeJob(jobType, workspace.id);

        await this.prisma.syncJob.update({
          where: { id: job.id },
          data: {
            jobStatus: 'success',
            completedAt: new Date(),
          },
        });

        console.log(`[Cron] ${jobType} completed for workspace ${workspace.id}`);
      } catch (error: any) {
        await this.prisma.syncJob.update({
          where: { id: job.id },
          data: {
            jobStatus: 'failed',
            errorMessage: error.message,
            retryCount: { increment: 1 },
          },
        });

        console.error(`[Cron] ${jobType} failed for workspace ${workspace.id}: ${error.message}`);
      }
    }
  }

  private async executeJob(jobType: string, workspaceId: string) {
    switch (jobType) {
      case 'keyword_sync':
        await this.syncKeywords(workspaceId);
        break;
      case 'competitor_sync':
        await this.syncCompetitors(workspaceId);
        break;
      case 'owned_refresh':
        await this.refreshOwnedMedia(workspaceId);
        break;
      case 'cleanup_old_data':
        await this.cleanupOldData(workspaceId);
        break;
      case 'retry_failed_jobs':
        await this.retryFailedJobs(workspaceId);
        break;
      default:
        console.warn(`[Cron] Unknown job type: ${jobType}`);
    }
  }

  private async syncKeywords(workspaceId: string) {
    const keywords = await this.prisma.monitoredKeyword.findMany({
      where: { workspaceId, isActive: true, syncFrequency: { not: 'manual' } },
    });

    for (const keyword of keywords) {
      await this.prisma.monitoredKeyword.update({
        where: { id: keyword.id },
        data: { lastSyncedAt: new Date() },
      });
    }
  }

  private async syncCompetitors(workspaceId: string) {
    const competitors = await this.prisma.monitoredCompetitor.findMany({
      where: { workspaceId, isActive: true },
    });

    for (const competitor of competitors) {
      await this.prisma.monitoredCompetitor.update({
        where: { id: competitor.id },
        data: { lastSyncedAt: new Date() },
      });
    }
  }

  private async refreshOwnedMedia(workspaceId: string) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { workspaceId, connectionStatus: 'active' },
    });

    for (const account of accounts) {
      await this.prisma.socialAccount.update({
        where: { id: account.id },
        data: { lastSyncedAt: new Date() },
      });
    }
  }

  private async cleanupOldData(workspaceId: string) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const deleted = await this.prisma.socialPost.deleteMany({
      where: {
        workspaceId,
        createdAt: { lt: ninetyDaysAgo },
        source: { not: 'meta_threads_api' },
      },
    });

    console.log(`[Cleanup] Deleted ${deleted.count} old posts for workspace ${workspaceId}`);
  }

  private async retryFailedJobs(workspaceId: string) {
    const failedJobs = await this.prisma.syncJob.findMany({
      where: {
        workspaceId,
        jobStatus: 'failed',
        retryCount: { lt: 3 },
        createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    for (const job of failedJobs) {
      await this.prisma.syncJob.update({
        where: { id: job.id },
        data: {
          jobStatus: 'queued',
          retryCount: { increment: 1 },
          errorMessage: null,
        },
      });
    }
  }

  async createJob(data: {
    workspaceId: string;
    jobType: string;
    queryReferenceId?: string;
  }) {
    return this.prisma.syncJob.create({
      data: {
        workspaceId: data.workspaceId,
        jobType: data.jobType,
        jobStatus: 'queued',
        queryReferenceId: data.queryReferenceId,
      },
    });
  }

  async getJobs(workspaceId: string, limit: number = 50) {
    return this.prisma.syncJob.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getJobStats(workspaceId: string) {
    const [total, queued, running, success, failed] = await Promise.all([
      this.prisma.syncJob.count({ where: { workspaceId } }),
      this.prisma.syncJob.count({ where: { workspaceId, jobStatus: 'queued' } }),
      this.prisma.syncJob.count({ where: { workspaceId, jobStatus: 'running' } }),
      this.prisma.syncJob.count({ where: { workspaceId, jobStatus: 'success' } }),
      this.prisma.syncJob.count({ where: { workspaceId, jobStatus: 'failed' } }),
    ]);

    return { total, queued, running, success, failed };
  }
}
