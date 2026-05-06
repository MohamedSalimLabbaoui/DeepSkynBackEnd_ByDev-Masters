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
var SignTranslationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignTranslationService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const prisma_service_1 = require("../prisma/prisma.service");
let SignTranslationService = SignTranslationService_1 = class SignTranslationService {
    constructor(httpService, prisma) {
        this.httpService = httpService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(SignTranslationService_1.name);
        this.MICROSERVICE_URL = process.env.SIGN_TRANSLATION_SERVICE_URL || 'http://localhost:8000';
        this.MAX_RETRIES = 3;
        this.RETRY_DELAY = 1000;
    }
    async translateText(dto) {
        return this.callMicroserviceWithRetry(dto.text, dto.language);
    }
    async translateVideoPost(postId, dto) {
        try {
            const translationResponse = await this.callMicroserviceWithRetry(dto.transcript, dto.language);
            const existing = await this.prisma.signTranslation.findUnique({
                where: { postId },
            });
            if (existing) {
                const result = await this.prisma.signTranslation.update({
                    where: { postId },
                    data: {
                        transcript: dto.transcript,
                        language: dto.language,
                        frames: JSON.stringify(translationResponse.frames),
                        metadata: JSON.stringify(translationResponse.metadata),
                        status: 'completed',
                    },
                });
                return this.parseTranslationResult(result);
            }
            else {
                const result = await this.prisma.signTranslation.create({
                    data: {
                        postId,
                        transcript: dto.transcript,
                        language: dto.language,
                        frames: JSON.stringify(translationResponse.frames),
                        metadata: JSON.stringify(translationResponse.metadata),
                        status: 'completed',
                    },
                });
                return this.parseTranslationResult(result);
            }
        }
        catch (error) {
            this.logger.error(`Error translating video post ${postId}: ${error.message}`);
            const existing = await this.prisma.signTranslation.findUnique({
                where: { postId },
            });
            const errorMessage = error.response?.data?.error ||
                error.message ||
                'Unknown error occurred';
            if (existing) {
                await this.prisma.signTranslation.update({
                    where: { postId },
                    data: {
                        status: 'error',
                        errorMessage,
                    },
                });
            }
            else {
                await this.prisma.signTranslation.create({
                    data: {
                        postId,
                        transcript: dto.transcript,
                        language: dto.language,
                        frames: [],
                        metadata: {},
                        status: 'error',
                        errorMessage,
                    },
                });
            }
            throw new common_1.HttpException({
                status: common_1.HttpStatus.BAD_REQUEST,
                message: `Translation failed: ${errorMessage}`,
            }, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getVideoPostTranslation(postId) {
        const translation = await this.prisma.signTranslation.findUnique({
            where: { postId },
        });
        if (!translation) {
            throw new common_1.HttpException({
                status: common_1.HttpStatus.NOT_FOUND,
                message: `No translation found for post ${postId}`,
            }, common_1.HttpStatus.NOT_FOUND);
        }
        return this.parseTranslationResult(translation);
    }
    async callMicroserviceWithRetry(text, language = 'fr', retryCount = 0) {
        try {
            if (retryCount === 0) {
                this.logger.log(`Calling microservice at ${this.MICROSERVICE_URL}/translate`);
            }
            const response = await (0, rxjs_1.lastValueFrom)(this.httpService.post(`${this.MICROSERVICE_URL}/translate`, { text, language }, {
                timeout: 30000,
            }));
            if (!response.data) {
                throw new Error('Empty response from microservice');
            }
            const convertedResponse = this.convertMicroserviceResponse(response.data);
            if (!convertedResponse.frames || convertedResponse.frames.length === 0) {
                throw new Error('Invalid response format from microservice: no frames generated');
            }
            return convertedResponse;
        }
        catch (error) {
            this.logger.warn(`Microservice call failed (attempt ${retryCount + 1}/${this.MAX_RETRIES}): ${error.message}`);
            if (retryCount < this.MAX_RETRIES - 1) {
                this.logger.debug(`Retrying in ${this.RETRY_DELAY}ms... (attempt ${retryCount + 2}/${this.MAX_RETRIES})`);
                await this.delay(this.RETRY_DELAY);
                return this.callMicroserviceWithRetry(text, language, retryCount + 1);
            }
            if (error.code === 'ECONNREFUSED') {
                this.logger.error(`Microservice unavailable at ${this.MICROSERVICE_URL}: Connection refused. ` +
                    `Make sure the Python service is running on port 8000.`);
                throw new common_1.HttpException({
                    status: common_1.HttpStatus.SERVICE_UNAVAILABLE,
                    message: 'Sign translation service is unavailable',
                    error: `Could not connect to ${this.MICROSERVICE_URL}. Make sure the microservice is running.`,
                }, common_1.HttpStatus.SERVICE_UNAVAILABLE);
            }
            if (error.response?.status === 400) {
                throw new common_1.HttpException({
                    status: common_1.HttpStatus.BAD_REQUEST,
                    message: 'Invalid language or missing lexicon',
                    error: error.response.data?.error,
                }, common_1.HttpStatus.BAD_REQUEST);
            }
            this.logger.error(`All retry attempts failed for text: "${text.substring(0, 50)}..." - ${error.message}`);
            throw new common_1.HttpException({
                status: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Failed to process sign translation after 3 attempts',
                error: error.message,
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    parseTranslationResult(translation) {
        return {
            id: translation.id,
            postId: translation.postId,
            transcript: translation.transcript,
            language: translation.language,
            frames: typeof translation.frames === 'string'
                ? JSON.parse(translation.frames)
                : translation.frames,
            metadata: typeof translation.metadata === 'string'
                ? JSON.parse(translation.metadata)
                : translation.metadata,
            status: translation.status,
            errorMessage: translation.errorMessage ?? undefined,
            createdAt: translation.createdAt,
            updatedAt: translation.updatedAt,
        };
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    convertMicroserviceResponse(response) {
        try {
            if (response.frames && response.frames[0]?.hand_right_keypoints) {
                return response;
            }
            const convertedFrames = response.frames?.map((frame) => {
                const keypoints = frame.keypoints || [];
                const hand_right_keypoints = [];
                const hand_left_keypoints = [];
                const pose_keypoints = [];
                keypoints.forEach((kp, index) => {
                    const keypoint = {
                        id: kp.name || `keypoint-${index}`,
                        x: kp.x || 0,
                        y: kp.y || 0,
                        z: kp.z || 0,
                    };
                    const name = kp.name?.toLowerCase() || '';
                    if (name.includes('right_hand')) {
                        hand_right_keypoints.push(keypoint);
                    }
                    else if (name.includes('left_hand')) {
                        hand_left_keypoints.push(keypoint);
                    }
                    else {
                        pose_keypoints.push(keypoint);
                    }
                });
                return {
                    hand_right_keypoints,
                    hand_left_keypoints,
                    pose_keypoints,
                };
            }) || [];
            const metadata = {
                gloss: response.metadata?.gloss || 'Unknown',
                fps: response.metadata?.fps || 30,
                total_frames: response.metadata?.total_frames || convertedFrames.length,
            };
            return {
                frames: convertedFrames,
                metadata,
            };
        }
        catch (error) {
            this.logger.error(`Error converting microservice response: ${error.message}`);
            return {
                frames: [],
                metadata: { gloss: 'Error', fps: 30, total_frames: 0 },
            };
        }
    }
};
exports.SignTranslationService = SignTranslationService;
exports.SignTranslationService = SignTranslationService = SignTranslationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        prisma_service_1.PrismaService])
], SignTranslationService);
//# sourceMappingURL=sign-translation.service.js.map