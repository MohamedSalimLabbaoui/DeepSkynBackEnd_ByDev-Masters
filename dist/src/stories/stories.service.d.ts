import { PrismaService } from '../prisma/prisma.service';
import { CreateStoryDto, CreateStoryCommentDto } from './dto/create-story.dto';
export declare class StoriesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: string, createStoryDto: CreateStoryDto): Promise<{
        user: {
            id: string;
            name: string;
            avatar: string;
        };
        _count: {
            comments: number;
            likes: number;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        expiresAt: Date;
        mediaUrl: string;
        musicUrl: string | null;
        musicTitle: string | null;
        highlightOrder: number | null;
        highlightTitle: string | null;
        isHighlight: boolean;
    }>;
    findAllActive(currentUserId?: string): Promise<{
        id: string;
        name: string;
        avatar: string;
        hasStory: boolean;
        isViewed: boolean;
        mediaUrl: string;
        musicUrl: string;
        musicTitle: string;
        userId: string;
        createdAt: Date;
        likesCount: number;
        commentsCount: number;
        isLiked: boolean;
    }[]>;
    getUserStories(userId: string): Promise<{
        id: string;
        mediaUrl: string;
        musicUrl: string;
        musicTitle: string;
        createdAt: Date;
        _count: {
            likes: number;
            comments: number;
        };
    }[]>;
    toggleLike(storyId: string, userId: string): Promise<{
        liked: boolean;
        likesCount: number;
    }>;
    addComment(userId: string, dto: CreateStoryCommentDto): Promise<{
        user: {
            id: string;
            name: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        comment: string;
        storyId: string;
    }>;
    getComments(storyId: string): Promise<({
        user: {
            id: string;
            name: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        comment: string;
        storyId: string;
    })[]>;
    deleteComment(commentId: string, userId: string): Promise<{
        deleted: boolean;
    }>;
    getFreeMusic(query?: string, limit?: number): Promise<any>;
    private getDefaultFreeMusic;
    getUserHighlights(userId: string): Promise<unknown[]>;
    saveStoryAsHighlight(storyId: string, userId: string, highlightTitle?: string): Promise<{
        user: {
            id: string;
            name: string;
            avatar: string;
        };
        _count: {
            comments: number;
            likes: number;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        expiresAt: Date;
        mediaUrl: string;
        musicUrl: string | null;
        musicTitle: string | null;
        highlightOrder: number | null;
        highlightTitle: string | null;
        isHighlight: boolean;
    }>;
    removeFromHighlight(storyId: string, userId: string): Promise<{
        user: {
            id: string;
            name: string;
            avatar: string;
        };
        _count: {
            comments: number;
            likes: number;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        expiresAt: Date;
        mediaUrl: string;
        musicUrl: string | null;
        musicTitle: string | null;
        highlightOrder: number | null;
        highlightTitle: string | null;
        isHighlight: boolean;
    }>;
}
