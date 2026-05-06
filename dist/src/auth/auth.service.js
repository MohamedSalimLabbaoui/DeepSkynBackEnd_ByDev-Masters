"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
const jwt = require("jsonwebtoken");
const two_factor_service_1 = require("./services/two-factor.service");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = require("bcrypt");
let AuthService = AuthService_1 = class AuthService {
    constructor(configService, twoFactorService, prisma) {
        this.configService = configService;
        this.twoFactorService = twoFactorService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(AuthService_1.name);
        this.keycloakUrl = this.configService.get('keycloak.auth-server-url');
        this.realm = this.configService.get('keycloak.realm');
        this.clientId = this.configService.get('keycloak.resource');
        this.clientSecret = this.configService.get('keycloak.credentials.secret');
        this.adminUser =
            this.configService.get('KEYCLOAK_ADMIN_USER') || 'admin';
        this.adminPassword =
            this.configService.get('KEYCLOAK_ADMIN_PASSWORD') || 'admin';
        this.adminClientId =
            this.configService.get('KEYCLOAK_ADMIN_CLIENT_ID') || 'admin-cli';
        this.adminClientSecret =
            this.configService.get('KEYCLOAK_ADMIN_CLIENT_SECRET') ||
                'pFhUhztRlEJaEM75T7S1qbYvzBR2FnV1';
    }
    async register(email, password, name, firstName, lastName) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('Un compte avec cet email existe déjà');
        }
        const adminToken = await this.getKeycloakAdminToken();
        const derivedFirstName = firstName || name.split(' ')[0] || name;
        const derivedLastName = lastName || name.split(' ').slice(1).join(' ') || '';
        let keycloakId = null;
        try {
            const createUserUrl = `${this.keycloakUrl}/admin/realms/${this.realm}/users`;
            const response = await axios_1.default.post(createUserUrl, {
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
            }, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json',
                },
            });
            const location = response.headers.location;
            if (location) {
                keycloakId = location.split('/').pop();
            }
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                const status = error.response?.status;
                const msg = error.response?.data?.errorMessage;
                if (status === 409) {
                    throw new common_1.ConflictException(msg || 'Un compte avec cet email existe déjà dans Keycloak');
                }
                this.logger.error(`Keycloak user creation failed: ${status} - ${JSON.stringify(error.response?.data)}`);
            }
            throw new common_1.InternalServerErrorException('Erreur lors de la création du compte. Veuillez réessayer.');
        }
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            await this.prisma.user.create({
                data: {
                    id: keycloakId || undefined,
                    email,
                    name,
                    password: hashedPassword,
                    emailVerified: true,
                    onboardingComplete: false,
                },
            });
        }
        catch (error) {
            this.logger.error('Prisma user creation failed - rolling back Keycloak user', error);
            if (keycloakId) {
                try {
                    await this.deleteKeycloakUser(adminToken, keycloakId);
                }
                catch (rollbackError) {
                    this.logger.error(`Failed to rollback Keycloak user ${keycloakId} after Prisma failure`, rollbackError);
                }
            }
            throw new common_1.InternalServerErrorException("Le compte n'a pas pu être créé correctement. Veuillez réessayer.");
        }
        const tokens = await this.authenticateWithKeycloak(email, password);
        return {
            requiresTwoFactor: false,
            tokens,
        };
    }
    async getKeycloakAdminToken() {
        const tokenUrl = `${this.keycloakUrl}/realms/master/protocol/openid-connect/token`;
        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');
            params.append('client_id', this.adminClientId);
            if (this.adminClientSecret) {
                params.append('client_secret', this.adminClientSecret);
            }
            const response = await axios_1.default.post(tokenUrl, params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            return response.data.access_token;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                this.logger.warn(`Admin token via client_credentials failed (${error.response?.status}). Falling back to password grant.`);
            }
        }
        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'password');
            params.append('client_id', this.adminClientId || 'admin-cli');
            params.append('username', this.adminUser);
            params.append('password', this.adminPassword);
            if (this.adminClientSecret) {
                params.append('client_secret', this.adminClientSecret);
            }
            const response = await axios_1.default.post(tokenUrl, params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            return response.data.access_token;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                this.logger.error(`Failed to obtain Keycloak admin token (${error.response?.status})`, error.response?.data);
            }
            else {
                this.logger.error('Failed to obtain Keycloak admin token', error);
            }
            throw new common_1.InternalServerErrorException('Impossible de contacter Keycloak avec les identifiants admin. Vérifiez KEYCLOAK_ADMIN_CLIENT_ID/SECRET ou KEYCLOAK_ADMIN_USER/PASSWORD.');
        }
    }
    async deleteKeycloakUser(adminToken, userId) {
        const url = `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}`;
        await axios_1.default.delete(url, {
            headers: {
                Authorization: `Bearer ${adminToken}`,
            },
        });
    }
    async login(username, password, twoFactorCode) {
        const user = await this.prisma.user.findUnique({
            where: { email: username },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Aucun compte trouvé avec cet email. Veuillez vous inscrire.');
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('Ce compte a été désactivé.');
        }
        const tokens = await this.authenticateWithKeycloak(username, password);
        const is2faEnabled = await this.twoFactorService.isTwoFactorEnabled(username);
        if (is2faEnabled) {
            if (!twoFactorCode) {
                return {
                    requiresTwoFactor: true,
                    message: "Code 2FA requis. Veuillez fournir le code de votre application d'authentification.",
                };
            }
            const isValid = await this.twoFactorService.verifyCodeByEmail(username, twoFactorCode);
            if (!isValid) {
                throw new common_1.UnauthorizedException('Code 2FA invalide');
            }
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                lastActivity: new Date(),
                sessionCount: {
                    increment: 1,
                },
            },
        });
        return {
            requiresTwoFactor: false,
            tokens,
        };
    }
    async authenticateWithKeycloak(username, password) {
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
            const response = await axios_1.default.post(tokenUrl, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            return response.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                throw new common_1.UnauthorizedException(error.response?.data?.error_description || 'Authentication failed');
            }
            throw new common_1.UnauthorizedException('Authentication failed');
        }
    }
    async refreshToken(refreshToken) {
        try {
            const tokenUrl = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`;
            const params = new URLSearchParams();
            params.append('grant_type', 'refresh_token');
            params.append('client_id', this.clientId);
            params.append('refresh_token', refreshToken);
            if (this.clientSecret) {
                params.append('client_secret', this.clientSecret);
            }
            const response = await axios_1.default.post(tokenUrl, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            return response.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                throw new common_1.UnauthorizedException(error.response?.data?.error_description || 'Token refresh failed');
            }
            throw new common_1.UnauthorizedException('Token refresh failed');
        }
    }
    async logout(refreshToken) {
        try {
            const logoutUrl = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/logout`;
            const params = new URLSearchParams();
            params.append('client_id', this.clientId);
            params.append('refresh_token', refreshToken);
            if (this.clientSecret) {
                params.append('client_secret', this.clientSecret);
            }
            await axios_1.default.post(logoutUrl, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                throw new common_1.UnauthorizedException(error.response?.data?.error_description || 'Logout failed');
            }
            throw new common_1.UnauthorizedException('Logout failed');
        }
    }
    async getUserInfo(accessToken) {
        try {
            const userInfoUrl = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/userinfo`;
            const response = await axios_1.default.get(userInfoUrl, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                throw new common_1.UnauthorizedException(error.response?.data?.error_description || 'Failed to get user info');
            }
            throw new common_1.UnauthorizedException('Failed to get user info');
        }
    }
    async validateToken(accessToken) {
        try {
            const introspectUrl = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token/introspect`;
            const params = new URLSearchParams();
            params.append('token', accessToken);
            params.append('client_id', this.clientId);
            if (this.clientSecret) {
                params.append('client_secret', this.clientSecret);
            }
            const response = await axios_1.default.post(introspectUrl, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            return response.data.active === true;
        }
        catch {
            return false;
        }
    }
    decodeToken(accessToken) {
        try {
            return jwt.decode(accessToken);
        }
        catch {
            return null;
        }
    }
    getRolesFromToken(accessToken) {
        const decoded = this.decodeToken(accessToken);
        if (!decoded) {
            return [];
        }
        const realmRoles = decoded.realm_access?.roles || [];
        const resourceRoles = decoded.resource_access?.[this.clientId]?.roles || [];
        return [...new Set([...realmRoles, ...resourceRoles])];
    }
    hasRole(accessToken, role) {
        const roles = this.getRolesFromToken(accessToken);
        return roles.includes(role);
    }
    hasAnyRole(accessToken, roles) {
        const userRoles = this.getRolesFromToken(accessToken);
        return roles.some((role) => userRoles.includes(role));
    }
    hasAllRoles(accessToken, roles) {
        const userRoles = this.getRolesFromToken(accessToken);
        return roles.every((role) => userRoles.includes(role));
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        return { message: 'Password changed successfully' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        two_factor_service_1.TwoFactorService,
        prisma_service_1.PrismaService])
], AuthService);
//# sourceMappingURL=auth.service.js.map