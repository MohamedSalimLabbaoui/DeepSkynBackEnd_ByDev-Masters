import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { TwoFactorService } from './services/two-factor.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

export interface KeycloakTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
  scope: string;
}

export interface LoginResponse {
  requiresTwoFactor: boolean;
  tokens?: KeycloakTokenResponse;
  message?: string;
}

export interface KeycloakUserInfo {
  sub: string;
  email_verified: boolean;
  name: string;
  preferred_username: string;
  given_name: string;
  family_name: string;
  email: string;
}

export interface DecodedToken {
  exp: number;
  iat: number;
  jti: string;
  iss: string;
  aud: string;
  sub: string;
  typ: string;
  azp: string;
  session_state: string;
  acr: string;
  realm_access: {
    roles: string[];
  };
  resource_access: {
    [key: string]: {
      roles: string[];
    };
  };
  scope: string;
  email_verified: boolean;
  name: string;
  preferred_username: string;
  given_name: string;
  family_name: string;
  email: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly keycloakUrl: string;
  private readonly realm: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly adminUser: string;
  private readonly adminPassword: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly twoFactorService: TwoFactorService,
    private readonly prisma: PrismaService,
  ) {
    this.keycloakUrl = this.configService.get<string>(
      'keycloak.auth-server-url',
    );
    this.realm = this.configService.get<string>('keycloak.realm');
    this.clientId = this.configService.get<string>('keycloak.resource');
    this.clientSecret = this.configService.get<string>(
      'keycloak.credentials.secret',
    );
    this.adminUser = this.configService.get<string>('KEYCLOAK_ADMIN_USER') || 'admin';
    this.adminPassword = this.configService.get<string>('KEYCLOAK_ADMIN_PASSWORD') || 'admin';
  }

  /**
   * Register a new user in Keycloak and Prisma, then auto-login
   */
  async register(
    email: string,
    password: string,
    name: string,
    firstName?: string,
    lastName?: string,
  ): Promise<LoginResponse> {
    // 1. Check if user already exists in Prisma
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Un compte avec cet email existe déjà');
    }

    // 2. Get Keycloak admin token
    const adminToken = await this.getKeycloakAdminToken();

    // 3. Create user in Keycloak
    const derivedFirstName = firstName || name.split(' ')[0] || name;
    const derivedLastName = lastName || name.split(' ').slice(1).join(' ') || '';

    // 4. Capture Keycloak User ID from admin token location header or look it up
    let keycloakId: string | null = null;
    try {
      const createUserUrl = `${this.keycloakUrl}/admin/realms/${this.realm}/users`;

      const response = await axios.post(
        createUserUrl,
        {
          username: email,
          email,
          firstName: derivedFirstName,
          lastName: derivedLastName,
          enabled: true,
          emailVerified: true,
          credentials: [
            {
              type: 'password',
              value: password,
              temporary: false,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // Keycloak returns the URL of the created user in the Location header
      const location = response.headers.location;
      if (location) {
        keycloakId = location.split('/').pop();
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const msg = error.response?.data?.errorMessage;
        if (status === 409) {
          throw new ConflictException(
            msg || 'Un compte avec cet email existe déjà dans Keycloak',
          );
        }
        this.logger.error(
          `Keycloak user creation failed: ${status} - ${JSON.stringify(error.response?.data)}`,
        );
      }
      throw new InternalServerErrorException(
        "Erreur lors de la création du compte. Veuillez réessayer.",
      );
    }

    // 5. Create user in Prisma with hashed password and SAME ID as Keycloak if possible
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      await this.prisma.user.create({
        data: {
          id: keycloakId || undefined, // Use Keycloak ID as Prisma ID
          email,
          name,
          password: hashedPassword,
          emailVerified: true,
          onboardingComplete: false,
        },
      });
    } catch (error) {
      this.logger.error('Prisma user creation failed', error);
      // User created in Keycloak but not in Prisma — still allow login
    }

    // 6. Auto-login: authenticate with Keycloak to get tokens
    const tokens = await this.authenticateWithKeycloak(email, password);

    return {
      requiresTwoFactor: false,
      tokens,
    };
  }

  /**
   * Get a Keycloak admin access token via password grant on the master realm
   */
  private async getKeycloakAdminToken(): Promise<string> {
    try {
      const tokenUrl = `${this.keycloakUrl}/realms/master/protocol/openid-connect/token`;

      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('client_id', 'admin-cli');
      params.append('username', this.adminUser);
      params.append('password', this.adminPassword);

      const response = await axios.post(tokenUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return response.data.access_token;
    } catch (error) {
      this.logger.error('Failed to obtain Keycloak admin token', error);
      throw new InternalServerErrorException(
        'Impossible de contacter le serveur d\'authentification',
      );
    }
  }

  /**
   * Authenticate user with username and password (with 2FA support)
   */
  async login(
    username: string,
    password: string,
    twoFactorCode?: string,
  ): Promise<LoginResponse> {
    // Check if user exists in database
    const user = await this.prisma.user.findUnique({
      where: { email: username },
    });
    if (!user) {
      throw new UnauthorizedException('Aucun compte trouvé avec cet email. Veuillez vous inscrire.');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Ce compte a été désactivé.');
    }

    // Authenticate with Keycloak
    const tokens = await this.authenticateWithKeycloak(username, password);

    // Check if user has 2FA enabled
    const is2faEnabled =
      await this.twoFactorService.isTwoFactorEnabled(username);

    if (is2faEnabled) {
      if (!twoFactorCode) {
        // 2FA is enabled but no code provided - ask for it
        return {
          requiresTwoFactor: true,
          message:
            "Code 2FA requis. Veuillez fournir le code de votre application d'authentification.",
        };
      }

      // Verify the 2FA code
      const isValid = await this.twoFactorService.verifyCodeByEmail(
        username,
        twoFactorCode,
      );
      if (!isValid) {
        throw new UnauthorizedException('Code 2FA invalide');
      }
    }

    return {
      requiresTwoFactor: false,
      tokens,
    };
  }

  /**
   * Authenticate with Keycloak (internal)
   */
  private async authenticateWithKeycloak(
    username: string,
    password: string,
  ): Promise<KeycloakTokenResponse> {
    try {
      const tokenUrl = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`;

      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('client_id', this.clientId);
      params.append('username', username);
      params.append('password', password);

      if (this.clientSecret) {
        params.append('client_secret', this.clientSecret);
      }

      const response = await axios.post<KeycloakTokenResponse>(
        tokenUrl,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new UnauthorizedException(
          error.response?.data?.error_description || 'Authentication failed',
        );
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<KeycloakTokenResponse> {
    try {
      const tokenUrl = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`;

      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('client_id', this.clientId);
      params.append('refresh_token', refreshToken);

      if (this.clientSecret) {
        params.append('client_secret', this.clientSecret);
      }

      const response = await axios.post<KeycloakTokenResponse>(
        tokenUrl,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new UnauthorizedException(
          error.response?.data?.error_description || 'Token refresh failed',
        );
      }
      throw new UnauthorizedException('Token refresh failed');
    }
  }

  /**
   * Logout user by invalidating the session
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      const logoutUrl = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/logout`;

      const params = new URLSearchParams();
      params.append('client_id', this.clientId);
      params.append('refresh_token', refreshToken);

      if (this.clientSecret) {
        params.append('client_secret', this.clientSecret);
      }

      await axios.post(logoutUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new UnauthorizedException(
          error.response?.data?.error_description || 'Logout failed',
        );
      }
      throw new UnauthorizedException('Logout failed');
    }
  }

  /**
   * Get user info from Keycloak
   */
  async getUserInfo(accessToken: string): Promise<KeycloakUserInfo> {
    try {
      const userInfoUrl = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/userinfo`;

      const response = await axios.get<KeycloakUserInfo>(userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new UnauthorizedException(
          error.response?.data?.error_description || 'Failed to get user info',
        );
      }
      throw new UnauthorizedException('Failed to get user info');
    }
  }

  /**
   * Validate access token
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const introspectUrl = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token/introspect`;

      const params = new URLSearchParams();
      params.append('token', accessToken);
      params.append('client_id', this.clientId);

      if (this.clientSecret) {
        params.append('client_secret', this.clientSecret);
      }

      const response = await axios.post(introspectUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return response.data.active === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Decode JWT token without verification (for extracting claims)
   */
  decodeToken(accessToken: string): DecodedToken | null {
    try {
      return jwt.decode(accessToken) as DecodedToken;
    } catch {
      return null;
    }
  }

  /**
   * Extract roles from token
   */
  getRolesFromToken(accessToken: string): string[] {
    const decoded = this.decodeToken(accessToken);
    if (!decoded) {
      return [];
    }

    const realmRoles = decoded.realm_access?.roles || [];
    const resourceRoles = decoded.resource_access?.[this.clientId]?.roles || [];

    return [...new Set([...realmRoles, ...resourceRoles])];
  }

  /**
   * Check if user has specific role
   */
  hasRole(accessToken: string, role: string): boolean {
    const roles = this.getRolesFromToken(accessToken);
    return roles.includes(role);
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(accessToken: string, roles: string[]): boolean {
    const userRoles = this.getRolesFromToken(accessToken);
    return roles.some((role) => userRoles.includes(role));
  }

  /**
   * Check if user has all of the specified roles
   */
  hasAllRoles(accessToken: string, roles: string[]): boolean {
    const userRoles = this.getRolesFromToken(accessToken);
    return roles.every((role) => userRoles.includes(role));
  }
}
