import { Module } from '@nestjs/common';
import { ThreadsService } from './threads.service';
import { ThreadsController } from './threads.controller';
import { PrismaService } from '../../services/prisma.service';
import { AuditLogService } from '../../services/audit-log.service';
import { CryptoService } from '../../services/crypto.service';
import { CacheService } from '../../services/cache.service';
import { MetaOAuthService } from '../../services/meta-oauth.service';
import { ThreadsApiService } from '../../services/threads-api.service';

@Module({
  providers: [
    ThreadsService,
    ThreadsApiService,
    MetaOAuthService,
    PrismaService,
    AuditLogService,
    CryptoService,
    CacheService,
  ],
  controllers: [ThreadsController],
  exports: [ThreadsService, ThreadsApiService, MetaOAuthService],
})
export class ThreadsModule {}
