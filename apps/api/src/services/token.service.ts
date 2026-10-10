import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UnauthorizedError } from '../utils/errors.js';
import type { JwtAuthPayload } from '../../../../packages/shared/src/types.js';

export class TokenService {
  private revokedTokens = new Set<string>();

  public generateToken(payload: Omit<JwtAuthPayload, 'iat' | 'exp'>): { token: string; expiresIn: string } {
    const token = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
    return { token, expiresIn: config.JWT_EXPIRES_IN };
  }

  public verifyToken(token: string): JwtAuthPayload {
    if (this.revokedTokens.has(token)) {
      throw new UnauthorizedError('Token has been revoked');
    }

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as JwtAuthPayload;
      return decoded;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Authentication token has expired');
      }
      throw new UnauthorizedError('Invalid authentication token');
    }
  }

  public revokeToken(token: string): void {
    this.revokedTokens.add(token);
  }

  public isRevoked(token: string): boolean {
    return this.revokedTokens.has(token);
  }
}

export const tokenService = new TokenService();
