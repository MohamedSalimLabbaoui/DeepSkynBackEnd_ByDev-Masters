import { ConfigService } from '@nestjs/config';
import { TwoFactorService } from './services/two-factor.service';
import { PrismaService } from '../prisma/prisma.service';
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
export declare class AuthService {
    private readonly configService;
    private readonly twoFactorService;
    private readonly prisma;
    private readonly logger;
    private readonly keycloakUrl;
    private readonly realm;
    private readonly clientId;
    private readonly clientSecret;
    private readonly adminUser;
    private readonly adminPassword;
    private readonly adminClientId;
    private readonly adminClientSecret;
    constructor(configService: ConfigService, twoFactorService: TwoFactorService, prisma: PrismaService);
    register(email: string, password: string, name: string, firstName?: string, lastName?: string): Promise<LoginResponse>;
    private getKeycloakAdminToken;
    private deleteKeycloakUser;
    login(username: string, password: string, twoFactorCode?: string): Promise<LoginResponse>;
    private authenticateWithKeycloak;
    refreshToken(refreshToken: string): Promise<KeycloakTokenResponse>;
    logout(refreshToken: string): Promise<void>;
    getUserInfo(accessToken: string): Promise<KeycloakUserInfo>;
    validateToken(accessToken: string): Promise<boolean>;
    decodeToken(accessToken: string): DecodedToken | null;
    getRolesFromToken(accessToken: string): string[];
    hasRole(accessToken: string, role: string): boolean;
    hasAnyRole(accessToken: string, roles: string[]): boolean;
    hasAllRoles(accessToken: string, roles: string[]): boolean;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{
        message: string;
    }>;
}
