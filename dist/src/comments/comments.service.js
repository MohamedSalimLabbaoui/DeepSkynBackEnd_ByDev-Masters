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
exports.CommentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CommentsService = class CommentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, createCommentDto) {
        const post = await this.prisma.post.findUnique({
            where: { id: createCommentDto.postId },
        });
        if (!post) {
            throw new common_1.NotFoundException(`Post ${createCommentDto.postId} non trouvé`);
        }
        if (createCommentDto.parentId) {
            const parent = await this.prisma.comment.findUnique({
                where: { id: createCommentDto.parentId },
            });
            if (!parent) {
                throw new common_1.NotFoundException(`Commentaire parent ${createCommentDto.parentId} non trouvé`);
            }
        }
        return this.prisma.comment.create({
            data: {
                userId,
                postId: createCommentDto.postId,
                comment: createCommentDto.comment,
                parentId: createCommentDto.parentId,
            },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
                _count: { select: { likes: true, replies: true } },
            },
        });
    }
    async findByPost(postId, page = 1, limit = 20, currentUserId) {
        const post = await this.prisma.post.findUnique({ where: { id: postId } });
        if (!post) {
            throw new common_1.NotFoundException(`Post ${postId} non trouvé`);
        }
        const skip = (page - 1) * limit;
        const [comments, total] = await Promise.all([
            this.prisma.comment.findMany({
                where: { postId, parentId: null },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    user: { select: { id: true, name: true, avatar: true } },
                    _count: { select: { likes: true, replies: true } },
                    likes: currentUserId ? { where: { userId: currentUserId } } : false,
                    replies: {
                        take: 3,
                        include: {
                            user: { select: { id: true, name: true, avatar: true } },
                            _count: { select: { likes: true } },
                        },
                    },
                },
            }),
            this.prisma.comment.count({ where: { postId, parentId: null } }),
        ]);
        const data = comments.map((c) => ({
            ...c,
            isLiked: currentUserId ? c.likes?.length > 0 : false,
            likes: undefined,
        }));
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findReplies(parentId, currentUserId) {
        const replies = await this.prisma.comment.findMany({
            where: { parentId },
            orderBy: { createdAt: 'asc' },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
                _count: { select: { likes: true } },
                likes: currentUserId ? { where: { userId: currentUserId } } : false,
            },
        });
        return replies.map((r) => ({
            ...r,
            isLiked: currentUserId ? r.likes?.length > 0 : false,
            likes: undefined,
        }));
    }
    async findOne(id, currentUserId) {
        const comment = await this.prisma.comment.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
                _count: { select: { likes: true, replies: true } },
                likes: currentUserId ? { where: { userId: currentUserId } } : false,
            },
        });
        if (!comment) {
            throw new common_1.NotFoundException(`Commentaire ${id} non trouvé`);
        }
        return {
            ...comment,
            isLiked: currentUserId ? comment.likes?.length > 0 : false,
            likes: undefined,
        };
    }
    async toggleLike(commentId, userId) {
        const existing = await this.prisma.commentLike.findUnique({
            where: { userId_commentId: { userId, commentId } },
        });
        if (existing) {
            await this.prisma.commentLike.delete({ where: { id: existing.id } });
            return { liked: false };
        }
        await this.prisma.commentLike.create({
            data: { userId, commentId },
        });
        return { liked: true };
    }
    async update(id, userId, updateCommentDto) {
        const comment = await this.prisma.comment.findUnique({ where: { id } });
        if (!comment) {
            throw new common_1.NotFoundException(`Commentaire ${id} non trouvé`);
        }
        if (comment.userId !== userId) {
            throw new common_1.ForbiddenException('Vous ne pouvez modifier que vos propres commentaires');
        }
        return this.prisma.comment.update({
            where: { id },
            data: { comment: updateCommentDto.comment },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
                _count: { select: { likes: true, replies: true } },
            },
        });
    }
    async remove(id, userId) {
        const comment = await this.prisma.comment.findUnique({ where: { id } });
        if (!comment) {
            throw new common_1.NotFoundException(`Commentaire ${id} non trouvé`);
        }
        if (comment.userId !== userId) {
            throw new common_1.ForbiddenException('Vous ne pouvez supprimer que vos propres commentaires');
        }
        await this.prisma.comment.delete({ where: { id } });
    }
    async countByPost(postId) {
        return this.prisma.comment.count({ where: { postId } });
    }
};
exports.CommentsService = CommentsService;
exports.CommentsService = CommentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CommentsService);
//# sourceMappingURL=comments.service.js.map