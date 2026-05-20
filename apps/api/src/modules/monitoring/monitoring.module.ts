import { Module } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { PrismaService } from '../../services/prisma.service';
import { AuditLogService } from '../../services/audit-log.service';

@Module({
  providers: [MonitoringService, PrismaService, AuditLogService],
  controllers: [MonitoringController],
  exports: [MonitoringService],
})
export class MonitoringModule {}
