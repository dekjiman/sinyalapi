import { Module } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { WorkspaceController } from './workspace.controller';
import { PrismaService } from '../../services/prisma.service';
import { AuditLogService } from '../../services/audit-log.service';

@Module({
  providers: [WorkspaceService, PrismaService, AuditLogService],
  controllers: [WorkspaceController],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
