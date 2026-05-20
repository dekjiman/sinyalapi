import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { PrismaService } from '../../services/prisma.service';

@Module({
  providers: [QueueService, PrismaService],
  controllers: [QueueController],
  exports: [QueueService],
})
export class QueueModule {}
