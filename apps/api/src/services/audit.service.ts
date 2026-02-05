import { createHash } from 'node:crypto';
import { prisma } from '../config/database.js';
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
          changes: entry.changes ?? undefined,
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
   * Hashes an IP address using SHA-256 for privacy-preserving storage.
   */
  hashIP(ip: string): string {
    return createHash('sha256').update(ip).digest('hex');
  }
}

export const auditService = new AuditService();
