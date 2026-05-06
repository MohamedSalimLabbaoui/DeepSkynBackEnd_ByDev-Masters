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
exports.PostsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PostsService = class PostsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, createPostDto) {
        return this.prisma.post.create({
            data: {
                userId,
                message: createPostDto.message,
                media: createPostDto.media,
            },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
            },
        });
    }
    async findAll(page = 1, limit = 20, currentUserId) {
        const skip = (page - 1) * limit;
        let where = { user: { isPublic: true } };
        if (currentUserId) {
            const followed = await this.prisma.follower.findMany({
                where: { followerId: currentUserId },
                select: { followingId: true },
            });
            const followingIds = followed.map((f) => f.followingId);
            where = {
                userId: { in: [currentUserId, ...followingIds] },
                status: 'published',
            };
        }
        else {
            where.status = 'published';
        }
        const [posts, total] = await Promise.all([
            this.prisma.post.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    user: {
                        select: { id: true, name: true, avatar: true, isPublic: true },
                    },
                    _count: { select: { likes: true, comments: true } },
                    likes: currentUserId
                        ? {
                            where: { userId: currentUserId },
                            select: { id: true, type: true },
                        }
                        : false,
                },
            }),
            this.prisma.post.count({ where }),
        ]);
        const postsWithLiked = posts.map((post) => ({
            ...post,
            isLiked: currentUserId ? post.likes?.length > 0 : false,
            reaction: currentUserId && post.likes?.length > 0 ? post.likes[0].type : null,
            likes: undefined,
        }));
        return {
            data: postsWithLiked,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findAllCommunityPosts(page = 1, limit = 20, currentUserId) {
        const skip = (page - 1) * limit;
        const where = {
            status: 'published',
            user: { isPublic: true, isActive: true },
        };
        const [posts, total] = await Promise.all([
            this.prisma.post.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    user: {
                        select: { id: true, name: true, avatar: true, isPublic: true },
                    },
                    _count: { select: { likes: true, comments: true } },
                    likes: currentUserId
                        ? {
                            where: { userId: currentUserId },
                            select: { id: true, type: true },
                        }
                        : false,
                },
            }),
            this.prisma.post.count({ where }),
        ]);
        const postsWithLiked = posts.map((post) => ({
            ...post,
            isLiked: currentUserId ? post.likes?.length > 0 : false,
            reaction: currentUserId && post.likes?.length > 0 ? post.likes[0].type : null,
            likes: undefined,
        }));
        return {
            data: postsWithLiked,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findByUser(userId, page = 1, limit = 20, currentUserId) {
        const skip = (page - 1) * limit;
        const [posts, total] = await Promise.all([
            this.prisma.post.findMany({
                where: {
                    userId,
                    status: currentUserId === userId ? { not: 'deleted' } : 'published',
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    user: { select: { id: true, name: true, avatar: true } },
                    _count: { select: { likes: true, comments: true } },
                    likes: currentUserId
                        ? {
                            where: { userId: currentUserId },
                            select: { id: true, type: true },
                        }
                        : false,
                },
            }),
            this.prisma.post.count({
                where: {
                    userId,
                    status: currentUserId === userId ? { not: 'deleted' } : 'published',
                },
            }),
        ]);
        const postsWithLiked = posts.map((post) => ({
            ...post,
            isLiked: currentUserId ? post.likes?.length > 0 : false,
            reaction: currentUserId && post.likes?.length > 0 ? post.likes[0].type : null,
            likes: undefined,
        }));
        return {
            data: postsWithLiked,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findArchives(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [posts, total] = await Promise.all([
            this.prisma.post.findMany({
                where: {
                    userId,
                    status: 'archived',
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limit,
                include: {
                    user: { select: { id: true, name: true, avatar: true } },
                    _count: { select: { likes: true, comments: true } },
                    likes: { where: { userId }, select: { id: true, type: true } },
                },
            }),
            this.prisma.post.count({
                where: {
                    userId,
                    status: 'archived',
                },
            }),
        ]);
        const postsWithLiked = posts.map((post) => ({
            ...post,
            isLiked: post.likes?.length > 0,
            reaction: post.likes?.length > 0 ? post.likes[0].type : null,
            likes: undefined,
        }));
        return {
            data: postsWithLiked,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findOne(id, currentUserId) {
        const post = await this.prisma.post.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
                _count: { select: { likes: true, comments: true } },
                likes: currentUserId
                    ? { where: { userId: currentUserId }, select: { id: true } }
                    : false,
            },
        });
        if (!post) {
            throw new common_1.NotFoundException(`Post ${id} non trouvé`);
        }
        return {
            ...post,
            isLiked: currentUserId ? post.likes?.length > 0 : false,
            reaction: currentUserId && post.likes?.length > 0
                ? post.likes[0].type
                : null,
            likes: undefined,
        };
    }
    async update(id, userId, updatePostDto) {
        const post = await this.prisma.post.findUnique({ where: { id } });
        if (!post) {
            throw new common_1.NotFoundException(`Post ${id} non trouvé`);
        }
        if (post.userId !== userId) {
            throw new common_1.ForbiddenException('Vous ne pouvez modifier que vos propres posts');
        }
        return this.prisma.post.update({
            where: { id },
            data: updatePostDto,
            include: {
                user: { select: { id: true, name: true, avatar: true } },
            },
        });
    }
    async remove(id, userId) {
        const post = await this.prisma.post.findUnique({ where: { id } });
        if (!post) {
            throw new common_1.NotFoundException(`Post ${id} non trouvé`);
        }
        if (post.userId !== userId) {
            throw new common_1.ForbiddenException('Vous ne pouvez supprimer que vos propres posts');
        }
        return this.prisma.post.delete({ where: { id } });
    }
    async toggleArchive(id, userId) {
        const post = await this.prisma.post.findUnique({ where: { id } });
        if (!post) {
            throw new common_1.NotFoundException(`Post ${id} non trouvé`);
        }
        if (post.userId !== userId) {
            throw new common_1.ForbiddenException('Vous ne pouvez archiver que vos propres posts');
        }
        const nextStatus = post.status === 'archived' ? 'published' : 'archived';
        return this.prisma.post.update({
            where: { id },
            data: { status: nextStatus },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
            },
        });
    }
    async findAllForAdmin(page = 1, limit = 20, options) {
        const skip = (page - 1) * limit;
        const where = {
            ...(options?.userId ? { userId: options.userId } : {}),
            ...(options?.reported ? { message: { startsWith: '[FLAGGED]' } } : {}),
        };
        const [posts, total] = await Promise.all([
            this.prisma.post.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    user: { select: { id: true, name: true, email: true, avatar: true } },
                    _count: { select: { likes: true, comments: true } },
                },
            }),
            this.prisma.post.count({ where }),
        ]);
        const mapped = posts.map((post) => ({
            ...post,
            isFlagged: post.message.startsWith('[FLAGGED]'),
            reportsCount: post.message.startsWith('[FLAGGED]') ? 1 : 0,
        }));
        return { posts: mapped, total, page, limit };
    }
    async moderatePost(id, payload) {
        const post = await this.prisma.post.findUnique({ where: { id } });
        if (!post) {
            throw new common_1.NotFoundException(`Post ${id} non trouvé`);
        }
        if (payload.remove) {
            await this.prisma.post.delete({ where: { id } });
            return { removed: true, id };
        }
        const flaggedPrefix = '[FLAGGED]';
        const alreadyFlagged = post.message.startsWith(flaggedPrefix);
        let nextMessage = post.message;
        if (payload.flagged && !alreadyFlagged) {
            nextMessage = `${flaggedPrefix} ${post.message}`;
        }
        if (!payload.flagged && alreadyFlagged) {
            nextMessage = post.message.replace(/^\[FLAGGED\]\s*/, '');
        }
        const updated = await this.prisma.post.update({
            where: { id },
            data: { message: nextMessage },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
                _count: { select: { likes: true, comments: true } },
            },
        });
        return {
            ...updated,
            isFlagged: payload.flagged,
            reportsCount: payload.flagged ? 1 : 0,
            moderationReason: payload.reason || null,
        };
    }
};
exports.PostsService = PostsService;
exports.PostsService = PostsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PostsService);
//# sourceMappingURL=posts.service.js.map