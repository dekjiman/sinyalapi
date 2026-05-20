import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import * as path from 'path';
import { AuthModule } from './modules/auth/auth.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { ThreadsModule } from './modules/threads/threads.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { QueueModule } from './modules/queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.join(__dirname, '..', '.env'),
        path.join(__dirname, '..', '..', '.env'),
      ],
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 900,
      max: 100,
    }),
    AuthModule,
    WorkspaceModule,
    ThreadsModule,
    MonitoringModule,
    DashboardModule,
    QueueModule,
  ],
})
export class AppModule {}
