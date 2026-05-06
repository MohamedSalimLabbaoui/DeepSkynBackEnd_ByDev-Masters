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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const two_factor_service_1 = require("./services/two-factor.service");
const google_auth_service_1 = require("./services/google-auth.service");
const facebook_auth_service_1 = require("./services/facebook-auth.service");
const recaptcha_service_1 = require("./services/recaptcha.service");
const keycloak_auth_guard_1 = require("./guards/keycloak-auth.guard");
const google_auth_guard_1 = require("./guards/google-auth.guard");
const facebook_auth_guard_1 = require("./guards/facebook-auth.guard");
const current_user_decorator_1 = require("./decorators/current-user.decorator");
const roles_decorator_1 = require("./decorators/roles.decorator");
const roles_guard_1 = require("./guards/roles.guard");
const login_2fa_dto_1 = require("./dto/login-2fa.dto");
const refresh_token_dto_1 = require("./dto/refresh-token.dto");
const logout_dto_1 = require("./dto/logout.dto");
const enable_2fa_dto_1 = require("./dto/enable-2fa.dto");
const verify_2fa_dto_1 = require("./dto/verify-2fa.dto");
const google_token_dto_1 = require("./dto/google-token.dto");
const forgot_password_dto_1 = require("./dto/forgot-password.dto");
const reset_password_dto_1 = require("./dto/reset-password.dto");
const register_dto_1 = require("./dto/register.dto");
const request_signup_code_dto_1 = require("./dto/request-signup-code.dto");
const verify_signup_code_dto_1 = require("./dto/verify-signup-code.dto");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const update_address_dto_1 = require("./dto/update-address.dto");
const password_reset_service_1 = require("./services/password-reset.service");
const signup_verification_service_1 = require("./services/signup-verification.service");
const prisma_service_1 = require("../prisma/prisma.service");
const axios_1 = require("axios");
const path = require("path");
const faceapi = require("face-api.js");
const tf = require("@tensorflow/tfjs");
const jpeg = require("jpeg-js");
const pngjs_1 = require("pngjs");
let AuthController = AuthController_1 = class AuthController {
    constructor(authService, twoFactorService, googleAuthService, facebookAuthService, recaptchaService, passwordResetService, signupVerificationService, prisma) {
        this.authService = authService;
        this.twoFactorService = twoFactorService;
        this.googleAuthService = googleAuthService;
        this.facebookAuthService = facebookAuthService;
        this.recaptchaService = recaptchaService;
        this.passwordResetService = passwordResetService;
        this.signupVerificationService = signupVerificationService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(AuthController_1.name);
    }
    async login(loginDto) {
        if (loginDto.captchaToken) {
            const isCaptchaValid = await this.recaptchaService.verify(loginDto.captchaToken);
            if (!isCaptchaValid) {
                throw new common_1.UnauthorizedException('Validation captcha échouée');
            }
        }
        return this.authService.login(loginDto.username, loginDto.password, loginDto.twoFactorCode);
    }
    async register(registerDto) {
        if (registerDto.captchaToken) {
            const isCaptchaValid = await this.recaptchaService.verify(registerDto.captchaToken);
            if (!isCaptchaValid) {
                throw new common_1.UnauthorizedException('Validation captcha échouée');
            }
        }
        return this.authService.register(registerDto.email, registerDto.password, registerDto.name, registerDto.firstName, registerDto.lastName);
    }
    async requestSignupCode(dto) {
        if (dto.captchaToken) {
            const isCaptchaValid = await this.recaptchaService.verify(dto.captchaToken);
            if (!isCaptchaValid) {
                throw new common_1.UnauthorizedException('Validation captcha echouee');
            }
        }
        return this.signupVerificationService.requestCode(dto);
    }
    async verifySignupCode(dto) {
        const payload = this.signupVerificationService.verifyCodeAndConsume(dto.email, dto.code);
        return this.authService.register(payload.email, payload.password, payload.name, payload.firstName, payload.lastName);
    }
    async generate2fa(userId) {
        console.log(userId);
        return this.twoFactorService.generateTwoFactorSecret(userId);
    }
    async enable2fa(userId, enable2faDto) {
        return this.twoFactorService.enable(userId, enable2faDto.code);
    }
    async disable2fa(userId, verify2faDto) {
        return this.twoFactorService.disable(userId, verify2faDto.code);
    }
    async verify2fa(userId, verify2faDto) {
        const valid = await this.twoFactorService.verifyCode(userId, verify2faDto.code);
        return { valid };
    }
    async verifySocial2fa(body) {
        const isValid = await this.twoFactorService.verifyCodeByEmail(body.email, body.code);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Code 2FA invalide');
        }
        const user = await this.prisma.user.findUnique({
            where: { email: body.email },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Utilisateur non trouvé');
        }
        const accessToken = this.googleAuthService.generateToken(user);
        return {
            requiresTwoFactor: false,
            tokens: {
                access_token: accessToken,
                refresh_token: '',
            },
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        };
    }
    async get2faStatus(userId) {
        return this.twoFactorService.getStatus(userId);
    }
    async refresh(refreshTokenDto) {
        return this.authService.refreshToken(refreshTokenDto.refresh_token);
    }
    async logout(logoutDto) {
        return this.authService.logout(logoutDto.refresh_token);
    }
    async getProfile(currentUser) {
        if (!currentUser || (!currentUser.sub && !currentUser.userId)) {
            throw new common_1.UnauthorizedException('User not found in token');
        }
        const userId = currentUser.sub || currentUser.userId;
        let user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                coverPhoto: true,
                dateOfBirth: true,
                gender: true,
                address: true,
                city: true,
                zipCode: true,
                country: true,
                latitude: true,
                longitude: true,
                preferredLanguage: true,
                isPublic: true,
                receiveRecommendations: true,
                onboardingComplete: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user && currentUser.email) {
            user = await this.prisma.user.findUnique({
                where: { email: currentUser.email },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    avatar: true,
                    coverPhoto: true,
                    dateOfBirth: true,
                    gender: true,
                    address: true,
                    city: true,
                    zipCode: true,
                    country: true,
                    latitude: true,
                    longitude: true,
                    preferredLanguage: true,
                    isPublic: true,
                    receiveRecommendations: true,
                    onboardingComplete: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        }
        if (!user) {
            throw new common_1.UnauthorizedException('Utilisateur non trouvé dans la base de données');
        }
        return user;
    }
    async updateProfile(userId, updateDto) {
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: updateDto,
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                coverPhoto: true,
                dateOfBirth: true,
                gender: true,
                address: true,
                city: true,
                zipCode: true,
                country: true,
                latitude: true,
                longitude: true,
                isPublic: true,
                receiveRecommendations: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return user;
    }
    async getAddress(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                address: true,
                city: true,
                zipCode: true,
                country: true,
                latitude: true,
                longitude: true,
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Utilisateur non trouvé');
        }
        return user;
    }
    async updateAddress(userId, updateAddressDto) {
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                address: updateAddressDto.address,
                city: updateAddressDto.city,
                zipCode: updateAddressDto.zipCode,
                country: updateAddressDto.country,
                latitude: updateAddressDto.latitude,
                longitude: updateAddressDto.longitude,
            },
            select: {
                id: true,
                address: true,
                city: true,
                zipCode: true,
                country: true,
                latitude: true,
                longitude: true,
            },
        });
        return user;
    }
    async deleteAddress(userId) {
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                address: null,
                city: null,
                zipCode: null,
                country: null,
                latitude: null,
                longitude: null,
            },
            select: {
                id: true,
                address: true,
                city: true,
                zipCode: true,
                country: true,
                latitude: true,
                longitude: true,
            },
        });
        return user;
    }
    async updateCoverPhoto(userId, body) {
        if (!body.coverPhotoUrl || typeof body.coverPhotoUrl !== 'string') {
            throw new common_1.BadRequestException('URL de photo de couverture requise et doit être une chaîne');
        }
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: { coverPhoto: body.coverPhotoUrl },
            select: {
                id: true,
                avatar: true,
                coverPhoto: true,
                name: true,
                email: true,
            },
        });
        return user;
    }
    async updateAvatar(userId, body) {
        if (!body.avatarUrl || typeof body.avatarUrl !== 'string') {
            throw new common_1.BadRequestException("URL d'avatar requise et doit être une chaîne");
        }
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: { avatar: body.avatarUrl },
            select: {
                id: true,
                avatar: true,
                coverPhoto: true,
                name: true,
                email: true,
            },
        });
        try {
            await this.syncFaceReferenceFromAvatar(userId, body.avatarUrl);
        }
        catch (error) {
            this.logger.warn(`Face reference sync skipped after avatar update for user ${userId}: ${error?.message || 'unknown error'}`);
        }
        return user;
    }
    async syncFaceReference(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { avatar: true },
        });
        if (!user?.avatar) {
            throw new common_1.BadRequestException('Aucune photo de profil disponible pour la synchronisation.');
        }
        await this.syncFaceReferenceFromAvatar(userId, user.avatar);
        return {
            success: true,
            message: 'Reference faciale synchronisee avec succes.',
        };
    }
    async getRoles(req) {
        const token = this.extractTokenFromRequest(req);
        const roles = this.authService.getRolesFromToken(token);
        return { roles };
    }
    async validateToken(req) {
        const token = this.extractTokenFromRequest(req);
        const valid = await this.authService.validateToken(token);
        const decoded = this.authService.decodeToken(token);
        return {
            valid,
            user: decoded
                ? {
                    sub: decoded.sub,
                    email: decoded.email,
                    name: decoded.name,
                    preferred_username: decoded.preferred_username,
                }
                : null,
        };
    }
    async adminOnly() {
        return { message: 'Welcome, admin!' };
    }
    async forgotPassword(forgotPasswordDto) {
        return this.passwordResetService.forgotPassword(forgotPasswordDto.email);
    }
    async resetPassword(resetPasswordDto) {
        return this.passwordResetService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
    }
    async validateResetToken(req) {
        const token = req.query.token;
        if (!token) {
            return { valid: false };
        }
        return this.passwordResetService.validateResetToken(token);
    }
    async changePassword(req, changePasswordDto) {
        const userId = req.user?.sub;
        if (!userId) {
            throw new common_1.BadRequestException('User not found');
        }
        return this.authService.changePassword(userId, changePasswordDto.currentPassword, changePasswordDto.newPassword);
    }
    async googleTokenAuth(googleTokenDto) {
        return this.googleAuthService.authenticateWithIdToken(googleTokenDto.idToken);
    }
    async googleAuth() {
    }
    async googleCallback(req, res) {
        const result = await this.googleAuthService.authenticateWithProfile(req.user);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
        const params = new URLSearchParams({
            userId: result.user.id,
            email: result.user.email,
            name: result.user.name,
            isNewUser: String(result.isNewUser),
            access_token: result.accessToken || '',
            requires_2fa: String(!!result.requiresTwoFactor),
        });
        return res.redirect(`${frontendUrl}/auth/google/callback?${params.toString()}`);
    }
    async facebookAuth() {
    }
    async facebookCallback(req, res) {
        const result = await this.facebookAuthService.authenticateWithProfile(req.user);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
        const params = new URLSearchParams({
            userId: result.user.id,
            email: result.user.email,
            name: result.user.name,
            isNewUser: String(result.isNewUser),
            access_token: result.accessToken || '',
            requires_2fa: String(!!result.requiresTwoFactor),
        });
        return res.redirect(`${frontendUrl}/auth/google/callback?${params.toString()}`);
    }
    async getAvatar(email) {
        const user = await this.prisma.user.findUnique({
            where: { email },
            select: { avatar: true },
        });
        if (!user)
            throw new common_1.UnauthorizedException('Utilisateur non trouvé');
        return { avatar: user.avatar };
    }
    async proxyAvatar(req, res) {
        const url = req.query.url;
        if (!url)
            return res.status(400).send('URL missing');
        if (url.startsWith('data:')) {
            try {
                const matches = url.match(/^data:([^;]+);base64,(.+)$/);
                if (!matches) {
                    return res.status(400).send('Invalid data URL format');
                }
                const contentType = matches[1];
                const base64Data = matches[2];
                const buffer = Buffer.from(base64Data, 'base64');
                res.set('Content-Type', contentType);
                res.set('Access-Control-Allow-Origin', '*');
                return res.send(buffer);
            }
            catch (error) {
                this.logger.error(`Error processing data URL: ${error.message}`);
                return res.status(500).send('Error processing data URL');
            }
        }
        try {
            const response = await axios_1.default.get(url, {
                responseType: 'stream',
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                },
            });
            res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
            res.set('Access-Control-Allow-Origin', '*');
            response.data.pipe(res);
        }
        catch (error) {
            this.logger.error(`Error fetching image from ${url}: ${error.message}`);
            res.status(500).send('Error fetching image');
        }
    }
    async faceLogin(body) {
        if ((!Array.isArray(body.descriptor) || body.descriptor.length === 0) &&
            !body.imageBase64) {
            throw new common_1.BadRequestException('Image faciale ou descripteur requis');
        }
        const user = await this.prisma.user.findUnique({
            where: { email: body.email },
        });
        if (!user)
            throw new common_1.UnauthorizedException('Utilisateur non trouvé');
        if (!user.isActive)
            throw new common_1.UnauthorizedException('Compte désactivé');
        let faceReference = await this.prisma.faceReference.findUnique({
            where: { userId: user.id },
            select: { descriptor: true },
        });
        if (!faceReference?.descriptor ||
            !Array.isArray(faceReference.descriptor)) {
            if (!user.avatar) {
                throw new common_1.UnauthorizedException('Aucune reference faciale enregistree pour ce compte');
            }
            await this.syncFaceReferenceFromAvatar(user.id, user.avatar);
            faceReference = await this.prisma.faceReference.findUnique({
                where: { userId: user.id },
                select: { descriptor: true },
            });
            if (!faceReference?.descriptor ||
                !Array.isArray(faceReference.descriptor)) {
                throw new common_1.UnauthorizedException('Aucune reference faciale enregistree pour ce compte');
            }
        }
        const liveDescriptor = Array.isArray(body.descriptor) && body.descriptor.length > 0
            ? body.descriptor
            : await this.extractDescriptorFromImageBase64(body.imageBase64);
        const confidence = this.calculateDescriptorSimilarity(liveDescriptor, faceReference.descriptor);
        if (confidence < 0.42) {
            throw new common_1.UnauthorizedException('Vérification faciale échouée');
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
        const accessToken = this.googleAuthService.generateToken(user);
        return {
            requiresTwoFactor: false,
            tokens: {
                access_token: accessToken,
                refresh_token: '',
            },
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        };
    }
    calculateDescriptorSimilarity(desc1, desc2) {
        if (desc1.length !== desc2.length) {
            throw new common_1.BadRequestException('Descripteurs faciaux incompatibles');
        }
        let sumSquares = 0;
        for (let i = 0; i < desc1.length; i++) {
            const diff = desc1[i] - desc2[i];
            sumSquares += diff * diff;
        }
        const euclideanDistance = Math.sqrt(sumSquares);
        const maxExpectedDistance = 1.2;
        return Math.max(0, 1 - euclideanDistance / maxExpectedDistance);
    }
    async ensureFaceModelsLoaded() {
        if (!AuthController_1.faceModelsLoadPromise) {
            const modelPath = path.join(process.cwd(), 'public', 'models');
            AuthController_1.faceModelsLoadPromise = Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath),
                faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath),
                faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath),
            ]).then(() => undefined);
        }
        try {
            await AuthController_1.faceModelsLoadPromise;
        }
        catch (error) {
            this.logger.error(`FaceID model loading failed: ${error?.message || 'unknown error'}`);
            AuthController_1.faceModelsLoadPromise = null;
            throw new common_1.UnauthorizedException('Modeles FaceID indisponibles');
        }
    }
    normalizeBase64(input) {
        if (input.startsWith('data:')) {
            const match = input.match(/^data:[^;]+;base64,(.+)$/);
            if (!match) {
                throw new common_1.BadRequestException('Format image base64 invalide');
            }
            return match[1];
        }
        return input;
    }
    decodeImageToTensor(imageBuffer) {
        const isPng = imageBuffer.length >= 8 &&
            imageBuffer[0] === 0x89 &&
            imageBuffer[1] === 0x50 &&
            imageBuffer[2] === 0x4e &&
            imageBuffer[3] === 0x47;
        const isJpeg = imageBuffer.length >= 3 &&
            imageBuffer[0] === 0xff &&
            imageBuffer[1] === 0xd8 &&
            imageBuffer[2] === 0xff;
        let width = 0;
        let height = 0;
        let rgbaData;
        if (isPng) {
            const decoded = pngjs_1.PNG.sync.read(imageBuffer);
            width = decoded.width;
            height = decoded.height;
            rgbaData = decoded.data;
        }
        else if (isJpeg) {
            const decoded = jpeg.decode(imageBuffer, { useTArray: true });
            width = decoded.width;
            height = decoded.height;
            rgbaData = decoded.data;
        }
        else {
            throw new common_1.BadRequestException('Format image non supporte (PNG/JPEG attendu)');
        }
        const rgbData = new Uint8Array(width * height * 3);
        for (let i = 0, j = 0; i < rgbaData.length; i += 4, j += 3) {
            rgbData[j] = rgbaData[i];
            rgbData[j + 1] = rgbaData[i + 1];
            rgbData[j + 2] = rgbaData[i + 2];
        }
        return tf.tensor3d(rgbData, [height, width, 3], 'int32');
    }
    async extractDescriptorFromImageBase64(imageBase64) {
        await this.ensureFaceModelsLoaded();
        let imageBuffer;
        try {
            imageBuffer = Buffer.from(this.normalizeBase64(imageBase64), 'base64');
        }
        catch {
            throw new common_1.BadRequestException('Image base64 invalide');
        }
        let tensor;
        try {
            tensor = this.decodeImageToTensor(imageBuffer);
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Image faciale illisible');
        }
        let detection;
        try {
            detection = await faceapi
                .detectSingleFace(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
                .withFaceLandmarks()
                .withFaceDescriptor();
        }
        finally {
            tensor.dispose();
        }
        if (!detection) {
            throw new common_1.UnauthorizedException('Aucun visage detecte dans la capture');
        }
        return Array.from(detection.descriptor);
    }
    async syncFaceReferenceFromAvatar(userId, avatarUrl) {
        const descriptor = await this.extractDescriptorFromImageBase64(avatarUrl);
        await this.prisma.faceReference.upsert({
            where: { userId },
            update: {
                descriptor,
                imageUrl: avatarUrl,
                updatedAt: new Date(),
            },
            create: {
                userId,
                descriptor,
                imageUrl: avatarUrl,
            },
        });
    }
    extractTokenFromRequest(req) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        return '';
    }
};
exports.AuthController = AuthController;
AuthController.faceModelsLoadPromise = null;
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Connexion utilisateur',
        description: "Authentifie un utilisateur via Keycloak avec support 2FA. Si le 2FA est activé et qu'aucun code n'est fourni, retourne requiresTwoFactor: true",
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Connexion réussie ou 2FA requis' }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Identifiants invalides ou code 2FA invalide',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_2fa_dto_1.Login2faDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Inscription utilisateur',
        description: 'Crée un nouveau compte utilisateur dans Keycloak et la base de données, puis authentifie automatiquement.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Compte créé et authentification réussie',
    }),
    (0, swagger_1.ApiResponse)({
        status: 409,
        description: 'Un compte avec cet email existe déjà',
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Données invalides' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('register/request-code'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Demander un code email pour inscription',
        description: "Envoie un code de verification a 6 chiffres sur l'email avant de finaliser l'inscription.",
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Code envoye' }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Donnees invalides ou email deja utilise',
    }),
    (0, swagger_1.ApiResponse)({ status: 429, description: 'Demande de code trop frequente' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [request_signup_code_dto_1.RequestSignupCodeDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "requestSignupCode", null);
__decorate([
    (0, common_1.Post)('register/verify-code'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Verifier le code email et creer le compte',
        description: 'Verifie le code recu par email puis finalise la creation du compte (Keycloak + base de donnees).',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Compte cree et utilisateur authentifie',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Code invalide/expire ou demande absente',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_signup_code_dto_1.VerifySignupCodeDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifySignupCode", null);
__decorate([
    (0, common_1.Post)('2fa/generate'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({
        summary: 'Générer le secret 2FA',
        description: "Génère un secret TOTP et un QR code pour configurer l'application d'authentification",
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Secret et QR code générés' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: '2FA déjà activé' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "generate2fa", null);
__decorate([
    (0, common_1.Post)('2fa/enable'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Activer le 2FA',
        description: 'Active le 2FA après vérification du code TOTP',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '2FA activé avec succès' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Code 2FA invalide' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, enable_2fa_dto_1.Enable2faDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "enable2fa", null);
__decorate([
    (0, common_1.Post)('2fa/disable'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Désactiver le 2FA',
        description: 'Désactive le 2FA après vérification du code',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '2FA désactivé' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Code 2FA invalide' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, verify_2fa_dto_1.Verify2faDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "disable2fa", null);
__decorate([
    (0, common_1.Post)('2fa/verify'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Vérifier un code 2FA',
        description: 'Vérifie un code TOTP',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Résultat de la vérification' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, verify_2fa_dto_1.Verify2faDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verify2fa", null);
__decorate([
    (0, common_1.Post)('social/2fa-verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Vérifier 2FA pour login social',
        description: 'Vérifie le code 2FA et retourne les tokens finaux',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifySocial2fa", null);
__decorate([
    (0, common_1.Get)('2fa/status'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({
        summary: 'Statut du 2FA',
        description: "Vérifie si le 2FA est activé pour l'utilisateur",
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Statut du 2FA' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "get2faStatus", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Rafraîchir le token',
        description: 'Obtient un nouveau access token à partir du refresh token',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Nouveau token généré' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Refresh token invalide ou expiré' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_token_dto_1.RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({
        summary: 'Déconnexion',
        description: 'Invalide la session utilisateur sur Keycloak',
    }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Déconnexion réussie' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Erreur lors de la déconnexion' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [logout_dto_1.LogoutDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('profile'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({
        summary: 'Profil utilisateur',
        description: 'Récupère les informations du profil depuis le JWT token',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Profil retourné avec succès' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Non authentifié' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Patch)('profile'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({
        summary: 'Mettre à jour le profil',
        description: "Met à jour les informations de base de l'utilisateur",
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Profil mis à jour' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Get)('address'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({
        summary: "Récupérer l'adresse",
        description: "Récupère les informations d'adresse de l'utilisateur",
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Adresse retournée' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Non authentifié' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getAddress", null);
__decorate([
    (0, common_1.Post)('address'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({
        summary: "Mettre à jour l'adresse",
        description: "Met à jour l'adresse et les coordonnées GPS de l'utilisateur",
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Adresse mise à jour' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Non authentifié' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_address_dto_1.UpdateAddressDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "updateAddress", null);
__decorate([
    (0, common_1.Delete)('address'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({
        summary: "Supprimer l'adresse",
        description: "Supprime les informations d'adresse de l'utilisateur",
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Adresse supprimée' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Non authentifié' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "deleteAddress", null);
__decorate([
    (0, common_1.Patch)('profile/cover'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({
        summary: 'Mettre à jour la photo de couverture',
        description: 'Met à jour la photo de couverture du profil utilisateur',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Photo de couverture mise à jour' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'URL de photo invalide' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Non authentifié' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "updateCoverPhoto", null);
__decorate([
    (0, common_1.Patch)('profile/avatar'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({
        summary: 'Mettre à jour la photo de profil',
        description: "Met à jour l'avatar/photo de profil de l'utilisateur",
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Photo de profil mise à jour' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: "URL d'avatar invalide" }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Non authentifié' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "updateAvatar", null);
__decorate([
    (0, common_1.Post)('face-reference/sync'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Synchroniser la reference faciale depuis la photo de profil',
        description: "Extrait un descripteur facial depuis l'avatar utilisateur et met a jour la reference faciale.",
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Reference faciale synchronisee' }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Avatar absent ou visage non detecte',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "syncFaceReference", null);
__decorate([
    (0, common_1.Get)('roles'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({
        summary: 'Rôles utilisateur',
        description: "Récupère les rôles de l'utilisateur depuis le token",
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Rôles retournés' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Non authentifié' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getRoles", null);
__decorate([
    (0, common_1.Get)('validate'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({
        summary: 'Valider le token',
        description: 'Vérifie si le token JWT est valide',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Token valide' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Token invalide ou expiré' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "validateToken", null);
__decorate([
    (0, common_1.Get)('admin'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({
        summary: 'Admin only',
        description: 'Endpoint réservé aux administrateurs',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Accès autorisé' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Non authentifié' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Accès refusé - rôle admin requis' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "adminOnly", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Mot de passe oublié',
        description: 'Envoie un email avec un lien de réinitialisation du mot de passe',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Email envoyé (si le compte existe)',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forgot_password_dto_1.ForgotPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Réinitialiser le mot de passe',
        description: 'Réinitialise le mot de passe avec le token reçu par email',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Mot de passe réinitialisé avec succès',
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Token invalide ou expiré' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Get)('reset-password/validate'),
    (0, swagger_1.ApiOperation)({
        summary: 'Valider un token de réinitialisation',
        description: 'Vérifie si un token de réinitialisation est encore valide',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Résultat de la validation' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "validateResetToken", null);
__decorate([
    (0, common_1.Post)('change-password'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Changer le mot de passe',
        description: 'Permet à un utilisateur authentifié de changer son mot de passe',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Mot de passe changé avec succès',
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Non authentifié' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Mot de passe actuel incorrect' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Post)('google/token'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Connexion/Inscription via Google (Mobile/SPA)',
        description: "Authentifie un utilisateur avec un Google ID Token. Crée automatiquement le compte si l'utilisateur est nouveau.",
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Authentification réussie' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Token Google invalide' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [google_token_dto_1.GoogleTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleTokenAuth", null);
__decorate([
    (0, common_1.Get)('google'),
    (0, common_1.UseGuards)(google_auth_guard_1.GoogleAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Connexion via Google (Web Redirect)',
        description: 'Redirige vers la page de connexion Google',
    }),
    (0, swagger_1.ApiResponse)({ status: 302, description: 'Redirection vers Google' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleAuth", null);
__decorate([
    (0, common_1.Get)('google/callback'),
    (0, common_1.UseGuards)(google_auth_guard_1.GoogleAuthGuard),
    (0, swagger_1.ApiExcludeEndpoint)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleCallback", null);
__decorate([
    (0, common_1.Get)('facebook'),
    (0, common_1.UseGuards)(facebook_auth_guard_1.FacebookAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Connexion via Facebook (Web Redirect)',
        description: 'Redirige vers la page de connexion Facebook',
    }),
    (0, swagger_1.ApiResponse)({ status: 302, description: 'Redirection vers Facebook' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "facebookAuth", null);
__decorate([
    (0, common_1.Get)('facebook/callback'),
    (0, common_1.UseGuards)(facebook_auth_guard_1.FacebookAuthGuard),
    (0, swagger_1.ApiExcludeEndpoint)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "facebookCallback", null);
__decorate([
    (0, common_1.Get)('avatar/:email'),
    (0, swagger_1.ApiOperation)({ summary: "Récupérer l'avatar d'un utilisateur par email" }),
    __param(0, (0, common_1.Param)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getAvatar", null);
__decorate([
    (0, common_1.Get)('proxy-avatar'),
    (0, swagger_1.ApiOperation)({
        summary: "Proxy pour les images d'avatar afin d'éviter les erreurs 429/CORS",
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "proxyAvatar", null);
__decorate([
    (0, common_1.Post)('face-login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Connexion via FaceID' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "faceLogin", null);
exports.AuthController = AuthController = AuthController_1 = __decorate([
    (0, swagger_1.ApiTags)('Auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        two_factor_service_1.TwoFactorService,
        google_auth_service_1.GoogleAuthService,
        facebook_auth_service_1.FacebookAuthService,
        recaptcha_service_1.RecaptchaService,
        password_reset_service_1.PasswordResetService,
        signup_verification_service_1.SignupVerificationService,
        prisma_service_1.PrismaService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map