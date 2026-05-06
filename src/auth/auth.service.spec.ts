import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import * as jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

// ── Mock ESM modules that break ts-jest ──────────────────────────────────────
// otplib and qrcode use ES module syntax (export const …) which ts-jest
// cannot parse. We mock the entire TwoFactorService so the import chain
// never reaches those packages.
jest.mock('./services/two-factor.service');

// Re-import AFTER the mock is registered
import { TwoFactorService } from './services/two-factor.service';

// Mock axios globally
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Helper: override the type-predicate isAxiosError for tests
function mockIsAxiosError(returnValue: boolean) {
  Object.defineProperty(mockedAxios, 'isAxiosError', {
    value: (_payload: unknown): _payload is AxiosError => returnValue,
    writable: true,
    configurable: true,
  });
}

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let twoFactorService: jest.Mocked<TwoFactorService>;

  const mockUser = {
    id: 'kc-user-uuid-123',
    email: 'test@deepskyn.com',
    name: 'Test User',
    password: '$2b$10$hashedpassword',
    isActive: true,
    emailVerified: true,
    onboardingComplete: false,
    lastActivity: new Date(),
    sessionCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockKeycloakTokenResponse = {
    access_token: 'mock_access_token',
    refresh_token: 'mock_refresh_token',
    expires_in: 300,
    refresh_expires_in: 1800,
    token_type: 'Bearer',
    scope: 'openid profile email',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                'keycloak.auth-server-url': 'http://localhost:8181',
                'keycloak.realm': 'master',
                'keycloak.resource': 'app',
                'keycloak.credentials.secret': 'test-secret',
                KEYCLOAK_ADMIN_USER: 'admin',
                KEYCLOAK_ADMIN_PASSWORD: 'admin',
                KEYCLOAK_ADMIN_CLIENT_ID: 'admin-cli',
                KEYCLOAK_ADMIN_CLIENT_SECRET: '',
              };
              return config[key] ?? null;
            }),
          },
        },
        {
          provide: TwoFactorService,
          useValue: {
            isTwoFactorEnabled: jest.fn(),
            verifyCodeByEmail: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    twoFactorService = module.get(TwoFactorService);

    // Setup axios.isAxiosError to return false by default
    mockIsAxiosError(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // decodeToken
  // ─────────────────────────────────────────────
  describe('decodeToken', () => {
    it('should return decoded token payload', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@deepskyn.com',
        realm_access: { roles: ['user'] },
        resource_access: {},
      };
      const token = jwt.sign(payload, 'secret');
      const result = service.decodeToken(token);
      expect(result).toBeDefined();
      expect(result?.sub).toBe('user-123');
    });

    it('should return null for invalid token', () => {
      const result = service.decodeToken('invalid.token.here');
      // jwt.decode does not throw on malformed tokens — it returns null
      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────
  // getRolesFromToken
  // ─────────────────────────────────────────────
  describe('getRolesFromToken', () => {
    it('should extract realm and resource roles', () => {
      const payload = {
        sub: 'user-123',
        realm_access: { roles: ['user', 'offline_access'] },
        resource_access: { app: { roles: ['premium'] } },
      };
      const token = jwt.sign(payload, 'secret');
      const roles = service.getRolesFromToken(token);
      expect(roles).toContain('user');
      expect(roles).toContain('premium');
    });

    it('should return empty array for invalid token', () => {
      const roles = service.getRolesFromToken('bad-token');
      expect(roles).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────
  // hasRole
  // ─────────────────────────────────────────────
  describe('hasRole', () => {
    it('should return true when user has the role', () => {
      const payload = {
        realm_access: { roles: ['admin'] },
        resource_access: {},
      };
      const token = jwt.sign(payload, 'secret');
      expect(service.hasRole(token, 'admin')).toBe(true);
    });

    it('should return false when user does not have the role', () => {
      const payload = {
        realm_access: { roles: ['user'] },
        resource_access: {},
      };
      const token = jwt.sign(payload, 'secret');
      expect(service.hasRole(token, 'admin')).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // hasAnyRole
  // ─────────────────────────────────────────────
  describe('hasAnyRole', () => {
    it('should return true when user has at least one of the roles', () => {
      const payload = {
        realm_access: { roles: ['user'] },
        resource_access: {},
      };
      const token = jwt.sign(payload, 'secret');
      expect(service.hasAnyRole(token, ['admin', 'user'])).toBe(true);
    });

    it('should return false when user has none of the roles', () => {
      const payload = {
        realm_access: { roles: ['guest'] },
        resource_access: {},
      };
      const token = jwt.sign(payload, 'secret');
      expect(service.hasAnyRole(token, ['admin', 'user'])).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // hasAllRoles
  // ─────────────────────────────────────────────
  describe('hasAllRoles', () => {
    it('should return true when user has all roles', () => {
      const payload = {
        realm_access: { roles: ['user', 'admin'] },
        resource_access: {},
      };
      const token = jwt.sign(payload, 'secret');
      expect(service.hasAllRoles(token, ['admin', 'user'])).toBe(true);
    });

    it('should return false when user is missing a role', () => {
      const payload = {
        realm_access: { roles: ['user'] },
        resource_access: {},
      };
      const token = jwt.sign(payload, 'secret');
      expect(service.hasAllRoles(token, ['admin', 'user'])).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // register
  // ─────────────────────────────────────────────
  describe('register', () => {
    it('should throw ConflictException if user already exists in Prisma', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(
        mockUser,
      );

      await expect(
        service.register('test@deepskyn.com', 'Password123!', 'Test User'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw InternalServerErrorException when Keycloak admin token fails', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      // Both admin token strategies fail
      mockedAxios.post = jest
        .fn()
        .mockRejectedValue(new Error('network error'));
      mockIsAxiosError(false);

      await expect(
        service.register('new@deepskyn.com', 'Password123!', 'New User'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ─────────────────────────────────────────────
  // login
  // ─────────────────────────────────────────────
  describe('login', () => {
    it('should throw UnauthorizedException when user is not found in DB', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        service.login('unknown@deepskyn.com', 'Password123!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user account is disabled', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        isActive: false,
      });

      await expect(
        service.login('test@deepskyn.com', 'Password123!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return requiresTwoFactor=true when 2FA is enabled and no code given', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(
        mockUser,
      );
      mockedAxios.post = jest.fn().mockResolvedValueOnce({
        data: mockKeycloakTokenResponse,
      });
      (twoFactorService.isTwoFactorEnabled as jest.Mock).mockResolvedValueOnce(
        true,
      );

      const result = await service.login('test@deepskyn.com', 'Password123!');
      expect(result.requiresTwoFactor).toBe(true);
      expect(result.tokens).toBeUndefined();
    });

    it('should throw UnauthorizedException when 2FA code is invalid', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(
        mockUser,
      );
      mockedAxios.post = jest.fn().mockResolvedValueOnce({
        data: mockKeycloakTokenResponse,
      });
      (twoFactorService.isTwoFactorEnabled as jest.Mock).mockResolvedValueOnce(
        true,
      );
      (twoFactorService.verifyCodeByEmail as jest.Mock).mockResolvedValueOnce(
        false,
      );

      await expect(
        service.login('test@deepskyn.com', 'Password123!', '000000'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens on successful login without 2FA', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(
        mockUser,
      );
      mockedAxios.post = jest.fn().mockResolvedValueOnce({
        data: mockKeycloakTokenResponse,
      });
      (twoFactorService.isTwoFactorEnabled as jest.Mock).mockResolvedValueOnce(
        false,
      );
      (prismaService.user.update as jest.Mock).mockResolvedValueOnce(mockUser);

      const result = await service.login('test@deepskyn.com', 'Password123!');
      expect(result.requiresTwoFactor).toBe(false);
      expect(result.tokens).toEqual(mockKeycloakTokenResponse);
    });
  });

  // ─────────────────────────────────────────────
  // validateToken
  // ─────────────────────────────────────────────
  describe('validateToken', () => {
    it('should return true when Keycloak introspect returns active=true', async () => {
      mockedAxios.post = jest
        .fn()
        .mockResolvedValueOnce({ data: { active: true } });

      const result = await service.validateToken('valid_token');
      expect(result).toBe(true);
    });

    it('should return false when Keycloak introspect returns active=false', async () => {
      mockedAxios.post = jest
        .fn()
        .mockResolvedValueOnce({ data: { active: false } });

      const result = await service.validateToken('expired_token');
      expect(result).toBe(false);
    });

    it('should return false when Keycloak call throws', async () => {
      mockedAxios.post = jest.fn().mockRejectedValueOnce(new Error('network'));

      const result = await service.validateToken('bad_token');
      expect(result).toBe(false);
    });
  });
});
