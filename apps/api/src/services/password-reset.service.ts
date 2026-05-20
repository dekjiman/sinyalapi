import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class PasswordResetService {
  private resetTokens = new Map<string, { userId: string; expiresAt: Date }>();

  constructor() {}

  generateToken(userId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour
    this.resetTokens.set(token, { userId, expiresAt });
    return token;
  }

  validateToken(token: string): string | null {
    const entry = this.resetTokens.get(token);
    if (!entry || entry.expiresAt < new Date()) {
      this.resetTokens.delete(token);
      return null;
    }
    return entry.userId;
  }

  invalidateToken(token: string): void {
    this.resetTokens.delete(token);
  }
}
