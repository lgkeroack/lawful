import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { authService } from '../services/auth.service.js';
import { auditService } from '../services/audit.service.js';
import { validate } from '../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
} from '../validators/auth.validator.js';

const router = Router();

/**
 * Rate limiter for login attempts: 10 requests per 15 minutes per IP.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    type: 'https://lexvault.io/problems/rate-limit',
    title: 'Too Many Requests',
    status: 429,
    detail: 'Too many login attempts. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Rate limiter for registration: 5 requests per hour per IP.
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    type: 'https://lexvault.io/problems/rate-limit',
    title: 'Too Many Requests',
    status: 429,
    detail: 'Too many registration attempts. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

/**
 * POST /api/auth/register
 * Creates a new user account and returns tokens.
 */
router.post(
  '/register',
  registerLimiter,
  validate({ body: registerSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, displayName } = req.body;
      const result = await authService.register(email, password, displayName);

      auditService.logAction({
        actorUserId: result.user.id,
        actorIp: req.ip || '0.0.0.0',
        action: 'auth.register',
        resourceType: 'user',
        resourceId: result.user.id,
        requestId: req.requestId,
        outcome: 'success',
      });

      res.status(201).json({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/auth/login
 * Authenticates a user and returns tokens.
 */
router.post(
  '/login',
  loginLimiter,
  validate({ body: loginSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      auditService.logAction({
        actorUserId: result.user.id,
        actorIp: req.ip || '0.0.0.0',
        action: 'auth.login',
        resourceType: 'user',
        resourceId: result.user.id,
        requestId: req.requestId,
        outcome: 'success',
      });

      res.status(200).json({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/auth/refresh
 * Refreshes access and refresh tokens using a valid refresh token.
 */
router.post(
  '/refresh',
  validate({ body: refreshTokenSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshToken(refreshToken);

      res.status(200).json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/auth/logout
 * Revokes the provided refresh token.
 */
router.post(
  '/logout',
  validate({ body: logoutSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken);

      res.status(200).json({ message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
