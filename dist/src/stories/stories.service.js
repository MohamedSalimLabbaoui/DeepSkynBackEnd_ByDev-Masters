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
exports.StoriesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let StoriesService = class StoriesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, createStoryDto) {
        if (!createStoryDto.mediaUrl) {
            throw new common_1.BadRequestException('mediaUrl is required');
        }
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        let validUserId = userId;
        const existingUser = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!existingUser) {
            const fallbackUser = await this.prisma.user.findFirst();
            if (!fallbackUser) {
                throw new common_1.BadRequestException("Aucun utilisateur n'existe dans la base de données.");
            }
            validUserId = fallbackUser.id;
        }
        return this.prisma.story.create({
            data: {
                userId: validUserId,
                mediaUrl: createStoryDto.mediaUrl,
                musicUrl: createStoryDto.musicUrl || null,
                musicTitle: createStoryDto.musicTitle || null,
                expiresAt,
            },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
                _count: { select: { likes: true, comments: true } },
            },
        });
    }
    async findAllActive(currentUserId) {
        const now = new Date();
        const where = {
            expiresAt: { gt: now },
        };
        if (currentUserId) {
            where.OR = [
                { userId: currentUserId },
                {
                    user: {
                        followers: {
                            some: { followerId: currentUserId },
                        },
                    },
                },
            ];
        }
        else {
            where.user = { isPublic: true };
        }
        const stories = await this.prisma.story.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, avatar: true } },
                _count: { select: { likes: true, comments: true } },
                likes: currentUserId
                    ? {
                        where: { userId: currentUserId },
                        select: { id: true },
                    }
                    : false,
            },
            orderBy: { createdAt: 'desc' },
        });
        const formatted = stories.map((s) => ({
            id: s.id,
            name: s.user.name || 'Utilisateur',
            avatar: s.user.avatar,
            hasStory: true,
            isViewed: false,
            mediaUrl: s.mediaUrl,
            musicUrl: s.musicUrl,
            musicTitle: s.musicTitle,
            userId: s.userId,
            createdAt: s.createdAt,
            likesCount: s._count.likes,
            commentsCount: s._count.comments,
            isLiked: currentUserId ? s.likes?.length > 0 : false,
        }));
        return formatted;
    }
    async getUserStories(userId) {
        if (!userId) {
            throw new common_1.BadRequestException('User ID is required');
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const stories = await this.prisma.story.findMany({
            where: { userId },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
                _count: { select: { likes: true, comments: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return stories.map((s) => ({
            id: s.id,
            mediaUrl: s.mediaUrl,
            musicUrl: s.musicUrl,
            musicTitle: s.musicTitle,
            createdAt: s.createdAt,
            _count: {
                likes: s._count.likes,
                comments: s._count.comments,
            },
        }));
    }
    async toggleLike(storyId, userId) {
        if (!userId) {
            throw new common_1.BadRequestException('User ID is required');
        }
        const story = await this.prisma.story.findUnique({
            where: { id: storyId },
        });
        if (!story)
            throw new common_1.NotFoundException('Story not found');
        const existing = await this.prisma.storyLike.findUnique({
            where: { userId_storyId: { userId, storyId } },
        });
        if (existing) {
            await this.prisma.storyLike.delete({ where: { id: existing.id } });
            const count = await this.prisma.storyLike.count({ where: { storyId } });
            return { liked: false, likesCount: count };
        }
        else {
            await this.prisma.storyLike.create({ data: { userId, storyId } });
            const count = await this.prisma.storyLike.count({ where: { storyId } });
            return { liked: true, likesCount: count };
        }
    }
    async addComment(userId, dto) {
        if (!userId) {
            throw new common_1.BadRequestException('User ID is required');
        }
        const story = await this.prisma.story.findUnique({
            where: { id: dto.storyId },
        });
        if (!story)
            throw new common_1.NotFoundException('Story not found');
        return this.prisma.storyComment.create({
            data: {
                userId,
                storyId: dto.storyId,
                comment: dto.comment,
            },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
            },
        });
    }
    async getComments(storyId) {
        return this.prisma.storyComment.findMany({
            where: { storyId },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
            },
            orderBy: { createdAt: 'asc' },
        });
    }
    async deleteComment(commentId, userId) {
        if (!userId) {
            throw new common_1.BadRequestException('User ID is required');
        }
        const comment = await this.prisma.storyComment.findUnique({
            where: { id: commentId },
        });
        if (!comment)
            throw new common_1.NotFoundException('Comment not found');
        if (comment.userId !== userId)
            throw new common_1.ForbiddenException('Not your comment');
        await this.prisma.storyComment.delete({ where: { id: commentId } });
        return { deleted: true };
    }
    async getFreeMusic(query = 'royalty free', limit = 10) {
        try {
            const archiveUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:audio&fl=identifier,title,creator&output=json&rows=${limit}`;
            const response = await fetch(archiveUrl);
            if (!response.ok)
                throw new Error('Failed to fetch music');
            const data = await response.json();
            const music = data.response?.docs?.map((doc) => ({
                id: doc.identifier,
                title: doc.title || doc.identifier,
                artist: doc.creator || 'Unknown',
                url: `https://archive.org/download/${doc.identifier}/${doc.identifier}.mp3`,
                source: 'Archive.org',
            })) || [];
            return music;
        }
        catch (error) {
            console.error('Error fetching free music:', error);
            return this.getDefaultFreeMusic();
        }
    }
    getDefaultFreeMusic() {
        return [
            {
                id: 'no_way_back',
                title: 'No Way Back',
                artist: 'Zerolex',
                url: 'https://www.zapsplat.com/download-free-music/zerolex-no-way-back/',
                source: 'ZapSplat',
            },
            {
                id: 'cinematic_inspiring',
                title: 'Cinematic Inspiring',
                artist: 'Bensound',
                url: 'https://www.bensound.com/bensound-music/bensound-cinematic.mp3',
                source: 'Bensound',
            },
            {
                id: 'ukulele_happy',
                title: 'Ukulele Happy',
                artist: 'Bensound',
                url: 'https://www.bensound.com/bensound-music/bensound-ukulele-happy.mp3',
                source: 'Bensound',
            },
            {
                id: 'sunny_days',
                title: 'Sunny Days',
                artist: 'Bensound',
                url: 'https://www.bensound.com/bensound-music/bensound-sunny.mp3',
                source: 'Bensound',
            },
        ];
    }
    async getUserHighlights(userId) {
        const highlights = await this.prisma.story.findMany({
            where: {
                userId,
                isHighlight: true,
            },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
                _count: { select: { likes: true, comments: true } },
            },
            orderBy: [{ highlightOrder: 'asc' }, { createdAt: 'desc' }],
        });
        const groupedHighlights = highlights.reduce((acc, story) => {
            const title = story.highlightTitle || 'Uncategorized';
            if (!acc[title]) {
                acc[title] = {
                    title,
                    stories: [],
                    coverImage: null,
                };
            }
            acc[title].stories.push(story);
            if (!acc[title].coverImage) {
                acc[title].coverImage = story.mediaUrl;
            }
            return acc;
        }, {});
        return Object.values(groupedHighlights);
    }
    async saveStoryAsHighlight(storyId, userId, highlightTitle) {
        const story = await this.prisma.story.findUnique({
            where: { id: storyId },
        });
        if (!story) {
            throw new common_1.NotFoundException('Story not found');
        }
        if (story.userId !== userId) {
            throw new common_1.ForbiddenException('You can only highlight your own stories');
        }
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 10);
        return this.prisma.story.update({
            where: { id: storyId },
            data: {
                isHighlight: true,
                highlightTitle: highlightTitle || 'Archive',
                expiresAt: futureDate,
            },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
                _count: { select: { likes: true, comments: true } },
            },
        });
    }
    async removeFromHighlight(storyId, userId) {
        const story = await this.prisma.story.findUnique({
            where: { id: storyId },
        });
        if (!story) {
            throw new common_1.NotFoundException('Story not found');
        }
        if (story.userId !== userId) {
            throw new common_1.ForbiddenException('You can only remove your own highlights');
        }
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        return this.prisma.story.update({
            where: { id: storyId },
            data: {
                isHighlight: false,
                highlightTitle: null,
                expiresAt,
            },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
                _count: { select: { likes: true, comments: true } },
            },
        });
    }
};
exports.StoriesService = StoriesService;
exports.StoriesService = StoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StoriesService);
//# sourceMappingURL=stories.service.js.map