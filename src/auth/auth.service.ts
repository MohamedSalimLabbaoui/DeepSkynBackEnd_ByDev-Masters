import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { TwoFactorService } from './services/two-factor.service';

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
  private readonly keycloakUrl: string;
  private readonly realm: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly twoFactorService: TwoFactorService,
  ) {
    this.keycloakUrl = this.configService.get<string>('keycloak.auth-server-url');
    this.realm = this.configService.get<string>('keycloak.realm');
    this.clientId = this.configService.get<string>('keycloak.resource');
    this.clientSecret = this.configService.get<string>('keycloak.credentials.secret');
  }

  /**
   * Authenticate user with username and password (with 2FA support)
   */
  async login(username: string, password: string, twoFactorCode?: string): Promise<LoginResponse> {
    // First, authenticate with Keycloak
    const tokens = await this.authenticateWithKeycloak(username, password);

    // Check if user has 2FA enabled
    const is2faEnabled = await this.twoFactorService.isTwoFactorEnabled(username);

    if (is2faEnabled) {
      if (!twoFactorCode) {
        // 2FA is enabled but no code provided - ask for it
        return {
          requiresTwoFactor: true,
          message: 'Code 2FA requis. Veuillez fournir le code de votre application d\'authentification.',
        };
      }

      // Verify the 2FA code
      const isValid = await this.twoFactorService.verifyCodeByEmail(username, twoFactorCode);
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
  private async authenticateWithKeycloak(username: string, password: string): Promise<KeycloakTokenResponse> {
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

      const response = await axios.post<KeycloakTokenResponse>(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

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

      const response = await axios.post<KeycloakTokenResponse>(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

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
