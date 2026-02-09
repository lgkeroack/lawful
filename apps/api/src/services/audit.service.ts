import { createHmac } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { createModuleLogger } from '../lib/logger.js';

const logger = createModuleLogger('audit.service');

export interface AuditLogEntry {
  actorUserId?: string;
  actorIp: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes?: Record<string, unknown>;
  requestId: string;
  outcome: 'success' | 'failure';
  failureReason?: string;
}

export class AuditService {
  /**
   * Creates an audit log entry recording an action performed on a resource.
   */
  async logAction(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          actorUserId: entry.actorUserId || null,
          actorIpHash: this.hashIP(entry.actorIp),
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          changes: entry.changes as Prisma.InputJsonValue ?? undefined,
          requestId: entry.requestId,
          outcome: entry.outcome,
          failureReason: entry.failureReason ?? null,
        },
      });

      logger.debug({
        message: 'Audit log entry created',
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        outcome: entry.outcome,
      });
    } catch (err) {
      // Audit logging failures should not break the main flow
      logger.error({
        message: 'Failed to create audit log entry',
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Hashes an IP address using HMAC-SHA256 keyed with JWT_SECRET.
   * Keyed hash prevents rainbow-table attacks against the limited IPv4 space.
   */
  hashIP(ip: string): string {
    return createHmac('sha256', env.JWT_SECRET).update(ip).digest('hex');
  }
}

export const auditService = new AuditService();
