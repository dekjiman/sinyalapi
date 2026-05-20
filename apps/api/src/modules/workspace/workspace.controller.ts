import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { JwtGuard } from '../../guards/jwt.guard';
import { createSuccessResponse } from '@/types';

@Controller('workspaces')
@UseGuards(JwtGuard)
export class WorkspaceController {
  constructor(private workspaceService: WorkspaceService) {}

  @Post()
  async create(@Body() body: { name: string }, @Request() req: any) {
    const data = await this.workspaceService.create(body.name, req.user.id);
    return createSuccessResponse(data);
  }

  @Get()
  async findAll(@Request() req: any) {
    const data = await this.workspaceService.findAll(req.user.id);
    return createSuccessResponse(data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.workspaceService.findOne(id);
    return createSuccessResponse(data);
  }
}
