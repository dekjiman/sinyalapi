import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditLogService } from '../services/audit-log.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const action = `${request.method} ${request.path}`;

    return next.handle().pipe(
      tap(async () => {
        const user = request.user;
        await this.auditLogService.log({
          workspaceId: request.params.workspaceId || request.body.workspaceId,
          userId: user?.id,
          action,
          entityType: request.params.entityType,
          entityId: request.params.id,
        });
      }),
    );
  }
}
