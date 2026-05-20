import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
import { AuditLogService } from '../../services/audit-log.service';

@Injectable()
export class WorkspaceService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async create(name: string, ownerUserId: string) {
    const workspace = await this.prisma.workspace.create({
      data: {
        name,
        ownerUserId,
        members: {
          create: {
            userId: ownerUserId,
            role: 'owner',
          },
        },
      },
    });

    await this.auditLogService.log({
      workspaceId: workspace.id,
      userId: ownerUserId,
      action: 'WORKSPACE_CREATED',
      entityType: 'workspace',
      entityId: workspace.id,
    });

    return workspace;
  }

  async findAll(userId: string) {
    return this.prisma.workspace.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
    });
  }

  async findOne(id: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return workspace;
  }
}
