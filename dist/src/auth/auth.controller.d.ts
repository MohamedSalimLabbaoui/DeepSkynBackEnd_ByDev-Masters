import { AuthService, KeycloakTokenResponse, LoginResponse } from './auth.service';
import { TwoFactorService } from './services/two-factor.service';
import { GoogleAuthService } from './services/google-auth.service';
import { FacebookAuthService } from './services/facebook-auth.service';
import { RecaptchaService } from './services/recaptcha.service';
import { Login2faDto } from './dto/login-2fa.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { Enable2faDto } from './dto/enable-2fa.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { GoogleTokenDto } from './dto/google-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestSignupCodeDto } from './dto/request-signup-code.dto';
import { VerifySignupCodeDto } from './dto/verify-signup-code.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { PasswordResetService } from './services/password-reset.service';
import { SignupVerificationService } from './services/signup-verification.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthController {
    private readonly authService;
    private readonly twoFactorService;
    private readonly googleAuthService;
    private readonly facebookAuthService;
    private readonly recaptchaService;
    private readonly passwordResetService;
    private readonly signupVerificationService;
    private readonly prisma;
    private readonly logger;
    private static faceModelsLoadPromise;
    constructor(authService: AuthService, twoFactorService: TwoFactorService, googleAuthService: GoogleAuthService, facebookAuthService: FacebookAuthService, recaptchaService: RecaptchaService, passwordResetService: PasswordResetService, signupVerificationService: SignupVerificationService, prisma: PrismaService);
    login(loginDto: Login2faDto): Promise<LoginResponse>;
    register(registerDto: RegisterDto): Promise<LoginResponse>;
    requestSignupCode(dto: RequestSignupCodeDto): Promise<{
        message: string;
        expiresInSeconds: number;
    }>;
    verifySignupCode(dto: VerifySignupCodeDto): Promise<LoginResponse>;
    generate2fa(userId: string): Promise<import("./services/two-factor.service").TwoFactorSetup>;
    enable2fa(userId: string, enable2faDto: Enable2faDto): Promise<{
        message: string;
    }>;
    disable2fa(userId: string, verify2faDto: Verify2faDto): Promise<{
        message: string;
    }>;
    verify2fa(userId: string, verify2faDto: Verify2faDto): Promise<{
        valid: boolean;
    }>;
    verifySocial2fa(body: {
        email: string;
        code: string;
    }): Promise<{
        requiresTwoFactor: boolean;
        tokens: {
            access_token: string;
            refresh_token: string;
        };
        user: {
            id: string;
            email: string;
            name: string;
        };
    }>;
    get2faStatus(userId: string): Promise<{
        enabled: boolean;
    }>;
    refresh(refreshTokenDto: RefreshTokenDto): Promise<KeycloakTokenResponse>;
    logout(logoutDto: LogoutDto): Promise<void>;
    getProfile(currentUser: any): Promise<{
        id: string;
        email: string;
        name: string;
        avatar: string;
        preferredLanguage: string;
        dateOfBirth: Date;
        gender: string;
        onboardingComplete: boolean;
        createdAt: Date;
        updatedAt: Date;
        address: string;
        city: string;
        zipCode: string;
        country: string;
        latitude: number;
        longitude: number;
        coverPhoto: string;
        isPublic: boolean;
        receiveRecommendations: boolean;
    }>;
    updateProfile(userId: string, updateDto: UpdateProfileDto): Promise<{
        id: string;
        email: string;
        name: string;
        avatar: string;
        dateOfBirth: Date;
        gender: string;
        createdAt: Date;
        updatedAt: Date;
        address: string;
        city: string;
        zipCode: string;
        country: string;
        latitude: number;
        longitude: number;
        coverPhoto: string;
        isPublic: boolean;
        receiveRecommendations: boolean;
    }>;
    getAddress(userId: string): Promise<{
        id: string;
        address: string;
        city: string;
        zipCode: string;
        country: string;
        latitude: number;
        longitude: number;
    }>;
    updateAddress(userId: string, updateAddressDto: UpdateAddressDto): Promise<{
        id: string;
        address: string;
        city: string;
        zipCode: string;
        country: string;
        latitude: number;
        longitude: number;
    }>;
    deleteAddress(userId: string): Promise<{
        id: string;
        address: string;
        city: string;
        zipCode: string;
        country: string;
        latitude: number;
        longitude: number;
    }>;
    updateCoverPhoto(userId: string, body: {
        coverPhotoUrl: string;
    }): Promise<{
        id: string;
        email: string;
        name: string;
        avatar: string;
        coverPhoto: string;
    }>;
    updateAvatar(userId: string, body: {
        avatarUrl: string;
    }): Promise<{
        id: string;
        email: string;
        name: string;
        avatar: string;
        coverPhoto: string;
    }>;
    syncFaceReference(userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getRoles(req: any): Promise<{
        roles: string[];
    }>;
    validateToken(req: any): Promise<{
        valid: boolean;
        user: any;
    }>;
    adminOnly(): Promise<{
        message: string;
    }>;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    validateResetToken(req: any): Promise<{
        valid: boolean;
        email?: string;
    }>;
    changePassword(req: any, changePasswordDto: {
        currentPassword: string;
        newPassword: string;
    }): Promise<{
        message: string;
    }>;
    googleTokenAuth(googleTokenDto: GoogleTokenDto): Promise<import("./services/google-auth.service").GoogleAuthResult>;
    googleAuth(): Promise<void>;
    googleCallback(req: any, res: any): Promise<any>;
    facebookAuth(): Promise<void>;
    facebookCallback(req: any, res: any): Promise<any>;
    getAvatar(email: string): Promise<{
        avatar: string;
    }>;
    proxyAvatar(req: any, res: any): Promise<any>;
    faceLogin(body: {
        email: string;
        descriptor?: number[];
        imageBase64?: string;
    }): Promise<{
        requiresTwoFactor: boolean;
        tokens: {
            access_token: string;
            refresh_token: string;
        };
        user: {
            id: string;
            email: string;
            name: string;
        };
    }>;
    private calculateDescriptorSimilarity;
    private ensureFaceModelsLoaded;
    private normalizeBase64;
    private decodeImageToTensor;
    private extractDescriptorFromImageBase64;
    private syncFaceReferenceFromAvatar;
    private extractTokenFromRequest;
}
