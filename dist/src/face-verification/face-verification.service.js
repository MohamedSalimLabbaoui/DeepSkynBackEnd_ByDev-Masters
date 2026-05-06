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
var FaceVerificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaceVerificationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const supabase_service_1 = require("../analysis/services/supabase.service");
const crypto = require("crypto");
const path = require("path");
const faceapi = require("face-api.js");
const tf = require("@tensorflow/tfjs");
const jpeg = require("jpeg-js");
const pngjs_1 = require("pngjs");
let FaceVerificationService = FaceVerificationService_1 = class FaceVerificationService {
    constructor(prisma, supabaseService) {
        this.prisma = prisma;
        this.supabaseService = supabaseService;
        this.SIMILARITY_THRESHOLD = 0.42;
        this.logger = new common_1.Logger(FaceVerificationService_1.name);
    }
    async ensureFaceModelsLoaded() {
        if (!FaceVerificationService_1.faceModelsLoadPromise) {
            const modelPath = path.join(process.cwd(), 'public', 'models');
            FaceVerificationService_1.faceModelsLoadPromise = Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath),
                faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath),
                faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath),
            ]).then(() => undefined);
        }
        try {
            await FaceVerificationService_1.faceModelsLoadPromise;
        }
        catch (error) {
            this.logger.error(`FaceID model loading failed: ${error?.message || 'unknown error'}`);
            FaceVerificationService_1.faceModelsLoadPromise = null;
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
            throw new common_1.BadRequestException('Aucun visage detecte dans la capture');
        }
        return Array.from(detection.descriptor);
    }
    async verifyFace(userId, faceDescriptor, imageBase64) {
        if (!faceDescriptor && !imageBase64) {
            throw new common_1.BadRequestException("Vous devez fournir soit le descripteur facial, soit l'image en base64");
        }
        let finalDescriptor = faceDescriptor;
        if (!finalDescriptor || finalDescriptor.length === 0) {
            finalDescriptor = await this.extractDescriptorFromImageBase64(imageBase64);
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true, avatar: true },
        });
        const userName = user?.name || user?.email?.split('@')[0] || 'utilisateur';
        if (!user?.avatar) {
            return {
                verified: false,
                confidence: 0,
                message: `${userName}, vous devez d'abord définir une photo de profil pour activer la vérification faciale.`,
                needsProfilePhoto: true,
            };
        }
        const faceReference = await this.prisma.faceReference.findUnique({
            where: { userId },
        });
        if (!faceReference) {
            return {
                verified: false,
                confidence: 0,
                message: `${userName}, veuillez d'abord enregistrer votre référence faciale depuis votre photo de profil dans les paramètres.`,
                needsProfilePhoto: true,
            };
        }
        const storedDescriptor = faceReference.descriptor;
        const similarity = this.calculateSimilarity(finalDescriptor, storedDescriptor);
        if (similarity >= this.SIMILARITY_THRESHOLD) {
            return {
                verified: true,
                confidence: similarity,
                message: `Identité vérifiée. Bonjour ${userName} !`,
                needsProfilePhoto: false,
            };
        }
        return {
            verified: false,
            confidence: similarity,
            message: `Vous n'êtes pas ${userName}. Cette analyse est réservée au propriétaire du compte.`,
            needsProfilePhoto: false,
        };
    }
    async registerFaceFromProfilePhoto(userId, descriptor) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { avatar: true },
        });
        if (!user?.avatar) {
            throw new common_1.BadRequestException("Vous devez d'abord définir une photo de profil");
        }
        await this.prisma.faceReference.upsert({
            where: { userId },
            update: {
                descriptor: descriptor,
                imageUrl: user.avatar,
                updatedAt: new Date(),
            },
            create: {
                userId,
                descriptor: descriptor,
                imageUrl: user.avatar,
            },
        });
    }
    async registerFaceReference(userId, descriptor, imageBase64) {
        if (!descriptor && !imageBase64) {
            throw new common_1.BadRequestException("Vous devez fournir soit le descripteur facial, soit l'image en base64");
        }
        let finalDescriptor = descriptor;
        if (!finalDescriptor || finalDescriptor.length === 0) {
            finalDescriptor = await this.extractDescriptorFromImageBase64(imageBase64);
        }
        let imageUrl = null;
        if (imageBase64) {
            const buffer = Buffer.from(imageBase64, 'base64');
            const filename = `face-reference-${userId}-${crypto.randomUUID()}.jpg`;
            const file = {
                originalname: filename,
                buffer,
                mimetype: 'image/jpeg',
            };
            const uploadResult = await this.supabaseService.uploadImage(file, userId);
            imageUrl = uploadResult.url;
        }
        await this.prisma.faceReference.upsert({
            where: { userId },
            update: {
                descriptor: finalDescriptor,
                imageUrl: imageUrl || '',
                updatedAt: new Date(),
            },
            create: {
                userId,
                descriptor: finalDescriptor,
                imageUrl: imageUrl || '',
            },
        });
    }
    calculateSimilarity(desc1, desc2) {
        if (desc1.length !== desc2.length) {
            throw new common_1.BadRequestException('Les descripteurs de visage ont des dimensions différentes');
        }
        let sumSquares = 0;
        for (let i = 0; i < desc1.length; i++) {
            const diff = desc1[i] - desc2[i];
            sumSquares += diff * diff;
        }
        const euclideanDistance = Math.sqrt(sumSquares);
        const maxExpectedDistance = 1.2;
        const similarity = Math.max(0, 1 - euclideanDistance / maxExpectedDistance);
        return similarity;
    }
    async hasFaceReference(userId) {
        const reference = await this.prisma.faceReference.findUnique({
            where: { userId },
        });
        return !!reference;
    }
    async deleteFaceReference(userId) {
        await this.prisma.faceReference
            .delete({
            where: { userId },
        })
            .catch(() => {
        });
    }
    async getFaceReference(userId) {
        return this.prisma.faceReference.findUnique({
            where: { userId },
            select: {
                id: true,
                imageUrl: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }
    async getProfilePhotoUrl(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { avatar: true },
        });
        return user?.avatar || null;
    }
};
exports.FaceVerificationService = FaceVerificationService;
FaceVerificationService.faceModelsLoadPromise = null;
exports.FaceVerificationService = FaceVerificationService = FaceVerificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        supabase_service_1.SupabaseService])
], FaceVerificationService);
//# sourceMappingURL=face-verification.service.js.map