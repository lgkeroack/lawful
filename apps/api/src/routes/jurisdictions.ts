import { Router, type Request, type Response, type NextFunction } from 'express';
import { jurisdictionService } from '../services/jurisdiction.service.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';

const router = Router();

const jurisdictionParamsSchema = z.object({
  id: z.string().uuid('Jurisdiction ID must be a valid UUID'),
});

/**
 * GET /api/jurisdictions
 * Returns the full jurisdiction hierarchy tree.
 * Federal -> Provincial -> Municipal, cached in Redis for 24 hours.
 */
router.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const tree = await jurisdictionService.getJurisdictionTree();
      res.status(200).json({ data: tree });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/jurisdictions/:id
 * Returns a single jurisdiction by ID, including parent and children.
 */
router.get(
  '/:id',
  validate({ params: jurisdictionParamsSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const jurisdiction = await jurisdictionService.getJurisdictionById(req.params.id);
      res.status(200).json({ data: jurisdiction });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
