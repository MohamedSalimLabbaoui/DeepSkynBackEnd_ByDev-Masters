import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as qs from 'qs';

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
}

@Injectable()
export class AuthService {
    private keycloakUrl: string;
    private realm: string;
    private clientId: string;
    private clientSecret: string;

    constructor(private configService: ConfigService) {
        this.keycloakUrl = this.configService.get<string>(
            'KEYCLOAK_AUTH_SERVER_URL',
            'http://localhost:8080',
        );
        this.realm = this.configService.get<string>('KEYCLOAK_REALM', 'master');
        this.clientId = this.configService.get<string>(
            'KEYCLOAK_RESOURCE',
            'app',
        );
        this.clientSecret = this.configService.get<string>('KEYCLOAK_SECRET', '');
    }

    /**
     * Authentifier un utilisateur avec username et password
     */
    async login(username: string, password: string): Promise<TokenResponse> {
        const tokenUrl = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`;

        try {
            const data = qs.stringify({
                grant_type: 'password',
                client_id: this.clientId,
                client_secret: this.clientSecret,
                username,
                password,
            });

            const response = await axios.post<TokenResponse>(tokenUrl, data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            return response.data;
        } catch (error: any) {
            console.error('Login error:', error.response?.data || error.message);
            throw new Error(`Authentification échouée: ${error.response?.data?.error_description || error.message}`);
        }
    }

    /**
     * Rafraîchir le token d'accès
     */
    async refreshToken(refreshToken: string): Promise<TokenResponse> {
        const tokenUrl = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`;

        try {
            const data = qs.stringify({
                grant_type: 'refresh_token',
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: refreshToken,
            });

            const response = await axios.post<TokenResponse>(tokenUrl, data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            return response.data;
        } catch (error: any) {
            console.error('Refresh token error:', error.response?.data || error.message);
            throw new Error('Impossible de rafraîchir le token');
        }
    }

    /**
     * Déconnexion de l'utilisateur
     */
    async logout(refreshToken: string): Promise<void> {
        const logoutUrl = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/logout`;

        try {
            const data = qs.stringify({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: refreshToken,
            });

            await axios.post(logoutUrl, data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
        } catch (error: any) {
            console.error('Logout error:', error.response?.data || error.message);
            throw new Error('Logout échoué');
        }
    }

    /**
     * Créer un nouvel utilisateur
     */
    async createUser(
        username: string,
        email: string,
        password: string,
        firstName?: string,
        lastName?: string,
    ): Promise<any> {
        const adminToken = await this.getAdminToken();
        const usersUrl = `${this.keycloakUrl}/admin/realms/${this.realm}/users`;

        try {
            const response = await axios.post(
                usersUrl,
                {
                    username,
                    email,
                    firstName: firstName || '',
                    lastName: lastName || '',
                    enabled: true,
                    emailVerified: false,
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

            return response.data;
        } catch (error: any) {
            throw new Error(
                `Erreur lors de la création de l'utilisateur: ${error.response?.data?.errorMessage || error.message}`,
            );
        }
    }

    /**
     * Obtenir les infos de l'utilisateur
     */
    async getUserInfo(accessToken: string): Promise<any> {
        const userInfoUrl = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/userinfo`;

        try {
            const response = await axios.get(userInfoUrl, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            return response.data;
        } catch (error) {
            throw new Error('Impossible de récupérer les infos utilisateur');
        }
    }

    /**
     * Obtenir un token administrateur (pour les opérations d'administration)
     */
    private async getAdminToken(): Promise<string> {
        const tokenUrl = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`;

        try {
            const data = qs.stringify({
                grant_type: 'password',
                client_id: this.clientId,
                client_secret: this.clientSecret,
                username: process.env.KEYCLOAK_ADMIN_USER || 'admin',
                password: process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin',
            });

            const response = await axios.post<TokenResponse>(tokenUrl, data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            return response.data.access_token;
        } catch (error: any) {
            console.error('Get admin token error:', error.response?.data || error.message);
            throw new Error('Impossible d\'obtenir le token administrateur');
        }
    }
}