import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';
import { AuthenticationError, ConflictError, ValidationError } from '../lib/errors.js';
import { createModuleLogger } from '../lib/logger.js';

const logger = createModuleLogger('auth.service');
const BCRYPT_ROUNDS = 12;

export class AuthService {
  async register(email: string, password: string, displayName: string) {
    // Validate password strength
    this.validatePassword(password);

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        displayName,
      },
      select: { id: true, email: true, displayName: true, createdAt: true, updatedAt: true },
    });

    logger.info({ userId: user.id, message: 'User registered successfully' });
    const tokens = this.generateTokens(user.id);
    return { user, ...tokens };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    logger.info({ userId: user.id, message: 'User logged in successfully' });
    const tokens = this.generateTokens(user.id);
    const { passwordHash, ...safeUser } = user;
    return { user: safeUser, ...tokens };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = jwt.verify(refreshToken, env.JWT_SECRET) as { userId: string; jti: string; type: string };
      if (payload.type !== 'refresh') {
        throw new AuthenticationError('Invalid token type');
      }

      // Check if token is revoked
      const isRevoked = await redis.get(`revoked:${payload.jti}`);
      if (isRevoked) {
        throw new AuthenticationError('Token has been revoked');
      }

      // Revoke old refresh token (rotation)
      await redis.set(`revoked:${payload.jti}`, '1', 'EX', 7 * 24 * 60 * 60);

      return this.generateTokens(payload.userId);
    } catch (err) {
      if (err instanceof AuthenticationError) throw err;
      throw new AuthenticationError('Invalid or expired refresh token');
    }
  }

  async logout(refreshToken: string) {
    try {
      const payload = jwt.verify(refreshToken, env.JWT_SECRET, { ignoreExpiration: true }) as { jti: string };
      await redis.set(`revoked:${payload.jti}`, '1', 'EX', 7 * 24 * 60 * 60);
    } catch {
      // Token already invalid, nothing to revoke
    }
  }

  private generateTokens(userId: string) {
    const accessJti = uuidv4();
    const refreshJti = uuidv4();

    const accessToken = jwt.sign(
      { userId, jti: accessJti, type: 'access' },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRY, issuer: 'lexvault', audience: 'lexvault-api' },
    );

    const refreshToken = jwt.sign(
      { userId, jti: refreshJti, type: 'refresh' },
      env.JWT_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRY, issuer: 'lexvault', audience: 'lexvault-api' },
    );

    return { accessToken, refreshToken };
  }

  private validatePassword(password: string) {
    if (password.length < 12) {
      throw new ValidationError('Password must be at least 12 characters long');
    }
    if (password.length > 128) {
      throw new ValidationError('Password must be 128 characters or fewer');
    }
    if (!/[A-Z]/.test(password)) {
      throw new ValidationError('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      throw new ValidationError('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      throw new ValidationError('Password must contain at least one digit');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new ValidationError('Password must contain at least one special character');
    }
  }
}

export const authService = new AuthService();
