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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaceVerificationController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const keycloak_auth_guard_1 = require("../auth/guards/keycloak-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const face_verification_service_1 = require("./face-verification.service");
const verify_face_dto_1 = require("./dto/verify-face.dto");
let FaceVerificationController = class FaceVerificationController {
    constructor(faceVerificationService) {
        this.faceVerificationService = faceVerificationService;
    }
    async verifyFace(userId, verifyFaceDto) {
        return this.faceVerificationService.verifyFace(userId, verifyFaceDto.descriptor, verifyFaceDto.imageBase64);
    }
    async getFaceStatus(userId) {
        const hasFaceReference = await this.faceVerificationService.hasFaceReference(userId);
        const faceReference = hasFaceReference
            ? await this.faceVerificationService.getFaceReference(userId)
            : null;
        const profilePhotoUrl = await this.faceVerificationService.getProfilePhotoUrl(userId);
        return {
            hasFaceReference,
            hasProfilePhoto: !!profilePhotoUrl,
            profilePhotoUrl,
            faceReference,
        };
    }
    async registerFromProfile(userId, verifyFaceDto) {
        await this.faceVerificationService.registerFaceFromProfilePhoto(userId, verifyFaceDto.descriptor);
        return {
            success: true,
            message: 'Référence faciale enregistrée depuis votre photo de profil',
        };
    }
    async registerFace(userId, verifyFaceDto) {
        await this.faceVerificationService.registerFaceReference(userId, verifyFaceDto.descriptor, verifyFaceDto.imageBase64);
        return {
            success: true,
            message: 'Référence faciale enregistrée avec succès',
        };
    }
    async resetFaceReference(userId) {
        await this.faceVerificationService.deleteFaceReference(userId);
        return {
            success: true,
            message: 'Référence faciale supprimée. Veuillez enregistrer une nouvelle référence depuis votre photo de profil.',
        };
    }
};
exports.FaceVerificationController = FaceVerificationController;
__decorate([
    (0, common_1.Post)('verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: "Vérifie si le visage correspond à l'utilisateur connecté",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Résultat de la vérification faciale',
        schema: {
            properties: {
                verified: { type: 'boolean' },
                confidence: { type: 'number' },
                message: { type: 'string' },
                needsProfilePhoto: { type: 'boolean' },
            },
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, verify_face_dto_1.VerifyFaceDto]),
    __metadata("design:returntype", Promise)
], FaceVerificationController.prototype, "verifyFace", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, swagger_1.ApiOperation)({
        summary: "Vérifie si l'utilisateur a une référence faciale et une photo de profil",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Statut de la référence faciale',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FaceVerificationController.prototype, "getFaceStatus", null);
__decorate([
    (0, common_1.Post)('register-from-profile'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Enregistre la référence faciale à partir de la photo de profil',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Référence faciale enregistrée depuis la photo de profil',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, verify_face_dto_1.VerifyFaceDto]),
    __metadata("design:returntype", Promise)
], FaceVerificationController.prototype, "registerFromProfile", null);
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: "Enregistre ou met à jour la référence faciale de l'utilisateur",
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Référence faciale enregistrée avec succès',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, verify_face_dto_1.VerifyFaceDto]),
    __metadata("design:returntype", Promise)
], FaceVerificationController.prototype, "registerFace", null);
__decorate([
    (0, common_1.Delete)('reset'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Supprime la référence faciale pour permettre une réinitialisation',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Référence faciale supprimée',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FaceVerificationController.prototype, "resetFaceReference", null);
exports.FaceVerificationController = FaceVerificationController = __decorate([
    (0, swagger_1.ApiTags)('Face Verification'),
    (0, common_1.Controller)('face-verification'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [face_verification_service_1.FaceVerificationService])
], FaceVerificationController);
//# sourceMappingURL=face-verification.controller.js.map