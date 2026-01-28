import {
    Controller,
    Post,
    Body,
    Get,
    UseGuards,
    HttpCode,
    BadRequestException,
} from '@nestjs/common';
import { AuthService, TokenResponse } from '../auth/auth.service';
import { KeycloakGuard } from '../auth/guards/keycloak.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LoginDto } from '../auth/dto/logindto';
import { RegisterDto } from '../auth/dto/registerdto';
import { RefreshTokenDto } from '../auth/dto/refreshtokendto';



@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    /**
     * Endpoint de login
     */
    @Post('login')
    @HttpCode(200)
    async login(@Body() loginDto: LoginDto): Promise<{ success: boolean; data: TokenResponse }> {
        if (!loginDto.username || !loginDto.password) {
            throw new BadRequestException(
                'Username et password sont requis',
            );
        }

        try {
            const tokens = await this.authService.login(
                loginDto.username,
                loginDto.password,
            );

            return {
                success: true,
                data: tokens,
            };
        } catch (error: any) {
            throw new BadRequestException(error.message);
        }
    }

    /**
     * Endpoint d'enregistrement
     */
    @Post('register')
    @HttpCode(201)
    async register(@Body() registerDto: RegisterDto) {
        if (!registerDto.username || !registerDto.email || !registerDto.password) {
            throw new BadRequestException(
                'Username, email et password sont requis',
            );
        }

        await this.authService.createUser(
            registerDto.username,
            registerDto.email,
            registerDto.password,
            registerDto.firstName,
            registerDto.lastName,
        );

        return {
            success: true,
            message: 'Utilisateur créé avec succès',
        };
    }

    /**
     * Endpoint pour rafraîchir le token
     */
    @Post('refresh')
    @HttpCode(200)
    async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<{ success: boolean; data: TokenResponse }> {
        if (!refreshTokenDto.refreshToken) {
            throw new BadRequestException('refreshToken est requis');
        }

        const tokens = await this.authService.refreshToken(
            refreshTokenDto.refreshToken,
        );

        return {
            success: true,
            data: tokens,
        };
    }

    /**
     * Endpoint pour se déconnecter
     */
    @Post('logout')
    @HttpCode(200)
    async logout(@Body() refreshTokenDto: RefreshTokenDto) {
        if (!refreshTokenDto.refreshToken) {
            throw new BadRequestException('refreshToken est requis');
        }

        await this.authService.logout(refreshTokenDto.refreshToken);

        return {
            success: true,
            message: 'Déconnexion réussie',
        };
    }

    /**
     * Endpoint protégé : infos de l'utilisateur courant
     */
    @Get('me')
    @UseGuards(KeycloakGuard)
    async getCurrentUser(@CurrentUser() user: any) {
        return {
            success: true,
            data: user,
        };
    }

    /**
     * Endpoint pour obtenir les infos utilisateur détaillées
     */
    @Get('userinfo')
    @UseGuards(KeycloakGuard)
    async getUserInfo(@CurrentUser() user: any) {
        const userInfo = await this.authService.getUserInfo(
            user.accessToken || '',
        );

        return {
            success: true,
            data: userInfo,
        };
    }
}