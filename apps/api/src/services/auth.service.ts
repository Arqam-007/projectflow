import { userRepository, type UserRecord } from '../repositories/user.repository.js';
import { passwordService } from './password.service.js';
import { tokenService } from './token.service.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../utils/errors.js';
import type {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  UserSummary,
} from '../../../../packages/shared/src/types.js';

export function sanitizeUser(user: UserRecord): UserSummary {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  };
}

export class AuthService {
  public async register(data: RegisterRequest): Promise<AuthResponse> {
    const normalizedEmail = data.email.trim().toLowerCase();

    // Enforce email uniqueness
    const existing = await userRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictError('An account with this email address already exists');
    }

    // Securely hash password
    const passwordHash = await passwordService.hashPassword(data.password);

    // Persist new user
    const newUser = await userRepository.create({
      email: normalizedEmail,
      name: data.name.trim(),
      passwordHash,
    });

    // Generate JWT access token
    const { token, expiresIn } = tokenService.generateToken({
      userId: newUser.id,
      email: newUser.email,
      tokenVersion: newUser.tokenVersion,
    });

    return {
      user: sanitizeUser(newUser),
      accessToken: token,
      expiresIn,
    };
  }

  public async login(data: LoginRequest): Promise<AuthResponse> {
    const normalizedEmail = data.email.trim().toLowerCase();

    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user) {
      // Safe generic message to prevent email enumeration
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await passwordService.comparePassword(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const { token, expiresIn } = tokenService.generateToken({
      userId: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion,
    });

    return {
      user: sanitizeUser(user),
      accessToken: token,
      expiresIn,
    };
  }

  public async logout(userId: string, rawToken?: string): Promise<void> {
    if (rawToken) {
      tokenService.revokeToken(rawToken);
    }

    // Invalidate any issued token by incrementing token version
    await userRepository.incrementTokenVersion(userId);
  }

  public async getProfile(userId: string): Promise<UserSummary> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    return sanitizeUser(user);
  }
}

export const authService = new AuthService();
