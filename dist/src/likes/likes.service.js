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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LikesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let LikesService = class LikesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async like(userId, postId) {
        const post = await this.prisma.post.findUnique({ where: { id: postId } });
        if (!post) {
            throw new common_1.NotFoundException(`Post ${postId} non trouvé`);
        }
        const existingLike = await this.prisma.like.findUnique({
            where: { userId_postId: { userId, postId } },
        });
        if (existingLike) {
            throw new common_1.ConflictException('Vous avez déjà liké ce post');
        }
        return this.prisma.like.create({
            data: { userId, postId },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
            },
        });
    }
    async unlike(userId, postId) {
        const existingLike = await this.prisma.like.findUnique({
            where: { userId_postId: { userId, postId } },
        });
        if (!existingLike) {
            throw new common_1.NotFoundException('Like non trouvé');
        }
        await this.prisma.like.delete({
            where: { userId_postId: { userId, postId } },
        });
    }
    async toggle(userId, postId, reactionType = 'like') {
        const post = await this.prisma.post.findUnique({ where: { id: postId } });
        if (!post) {
            throw new common_1.NotFoundException(`Post ${postId} non trouvé`);
        }
        const existingLike = await this.prisma.like.findUnique({
            where: { userId_postId: { userId, postId } },
        });
        let liked = true;
        let finalType = reactionType;
        if (existingLike) {
            if (existingLike.type === reactionType) {
                await this.prisma.like.delete({
                    where: { userId_postId: { userId, postId } },
                });
                liked = false;
                finalType = null;
            }
            else {
                await this.prisma.like.update({
                    where: { userId_postId: { userId, postId } },
                    data: { type: reactionType },
                });
                liked = true;
                finalType = reactionType;
            }
        }
        else {
            await this.prisma.like.create({
                data: { userId, postId, type: reactionType },
            });
            liked = true;
            finalType = reactionType;
        }
        const likesCount = await this.prisma.like.count({ where: { postId } });
        return { liked, type: finalType, likesCount };
    }
    async findByPost(postId, page = 1, limit = 50) {
        const post = await this.prisma.post.findUnique({ where: { id: postId } });
        if (!post) {
            throw new common_1.NotFoundException(`Post ${postId} non trouvé`);
        }
        const skip = (page - 1) * limit;
        const [likes, total] = await Promise.all([
            this.prisma.like.findMany({
                where: { postId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    user: { select: { id: true, name: true, avatar: true } },
                },
            }),
            this.prisma.like.count({ where: { postId } }),
        ]);
        return { likes, total };
    }
    async hasLiked(userId, postId) {
        const like = await this.prisma.like.findUnique({
            where: { userId_postId: { userId, postId } },
        });
        return !!like;
    }
};
exports.LikesService = LikesService;
exports.LikesService = LikesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LikesService);
//# sourceMappingURL=likes.service.js.map