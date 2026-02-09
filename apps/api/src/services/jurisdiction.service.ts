import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { createModuleLogger } from '../lib/logger.js';

const logger = createModuleLogger('jurisdiction.service');

const JURISDICTION_TREE_CACHE_KEY = 'jurisdictions:tree';
const JURISDICTION_CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds

export interface JurisdictionNode {
  id: string;
  name: string;
  code: string;
  level: string;
  parentId: string | null;
  legalSystem: string;
  geoCode: string | null;
  population: number | null;
  children: JurisdictionNode[];
}

export class JurisdictionService {
  /**
   * Returns the full jurisdiction hierarchy as a tree structure.
   * Federal -> Provincial -> Municipal
   * Results are cached in Redis for 24 hours.
   */
  async getJurisdictionTree(): Promise<JurisdictionNode[]> {
    // Try cache first
    try {
      const cached = await redis.get(JURISDICTION_TREE_CACHE_KEY);
      if (cached) {
        logger.debug({ message: 'Jurisdiction tree served from cache' });
        return JSON.parse(cached) as JurisdictionNode[];
      }
    } catch (err) {
      logger.warn({
        message: 'Failed to read jurisdiction tree from cache',
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Fetch all jurisdictions from DB
    const jurisdictions = await prisma.jurisdiction.findMany({
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    // Build tree structure
    const nodeMap = new Map<string, JurisdictionNode>();
    const roots: JurisdictionNode[] = [];

    // First pass: create all nodes
    for (const j of jurisdictions) {
      nodeMap.set(j.id, {
        id: j.id,
        name: j.name,
        code: j.code,
        level: j.level,
        parentId: j.parentId,
        legalSystem: j.legalSystem,
        geoCode: j.geoCode,
        population: j.population,
        children: [],
      });
    }

    // Second pass: wire up parent-child relationships
    for (const j of jurisdictions) {
      const node = nodeMap.get(j.id)!;
      if (j.parentId) {
        const parent = nodeMap.get(j.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          // Parent not found, treat as root
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    // Cache the tree
    try {
      await redis.set(
        JURISDICTION_TREE_CACHE_KEY,
        JSON.stringify(roots),
        'EX',
        JURISDICTION_CACHE_TTL,
      );
      logger.debug({ message: 'Jurisdiction tree cached' });
    } catch (err) {
      logger.warn({
        message: 'Failed to cache jurisdiction tree',
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return roots;
  }

  /**
   * Returns a single jurisdiction by its ID.
   */
  async getJurisdictionById(id: string): Promise<{
    id: string;
    name: string;
    code: string;
    level: string;
    parentId: string | null;
    legalSystem: string;
    geoCode: string | null;
    population: number | null;
    parent: { id: string; name: string; code: string } | null;
    children: { id: string; name: string; code: string; level: string }[];
  }> {
    const jurisdiction = await prisma.jurisdiction.findUnique({
      where: { id },
      include: {
        parent: {
          select: { id: true, name: true, code: true },
        },
        children: {
          select: { id: true, name: true, code: true, level: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!jurisdiction) {
      throw new NotFoundError(`Jurisdiction with ID "${id}" not found`);
    }

    return jurisdiction;
  }

  /**
   * Batch lookup: validates that all provided IDs exist and returns the jurisdictions.
   * Throws a ValidationError if any IDs are not found.
   */
  async getJurisdictionsByIds(ids: string[]): Promise<
    { id: string; name: string; code: string; level: string }[]
  > {
    if (ids.length === 0) {
      return [];
    }

    const uniqueIds = [...new Set(ids)];

    const jurisdictions = await prisma.jurisdiction.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, name: true, code: true, level: true },
    });

    if (jurisdictions.length !== uniqueIds.length) {
      const foundIds = new Set(jurisdictions.map((j) => j.id));
      const missingIds = uniqueIds.filter((id) => !foundIds.has(id));
      throw new ValidationError(
        `The following jurisdiction IDs were not found: ${missingIds.join(', ')}`,
      );
    }

    return jurisdictions;
  }
}

export const jurisdictionService = new JurisdictionService();
