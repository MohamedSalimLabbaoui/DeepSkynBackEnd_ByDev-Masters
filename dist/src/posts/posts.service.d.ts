import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto, UpdatePostDto } from './dto';
import { Post } from '@prisma/client';
export interface PostWithDetails extends Post {
    user: {
        id: string;
        name: string | null;
        avatar: string | null;
    };
    _count: {
        likes: number;
        comments: number;
    };
    isLiked?: boolean;
}
export declare class PostsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(userId: string, createPostDto: CreatePostDto): Promise<Post>;
    findAll(page?: number, limit?: number, currentUserId?: string): Promise<any>;
    findAllCommunityPosts(page?: number, limit?: number, currentUserId?: string): Promise<any>;
    findByUser(userId: string, page?: number, limit?: number, currentUserId?: string): Promise<any>;
    findArchives(userId: string, page?: number, limit?: number): Promise<{
        data: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(id: string, currentUserId?: string): Promise<PostWithDetails>;
    update(id: string, userId: string, updatePostDto: UpdatePostDto): Promise<Post>;
    remove(id: string, userId: string): Promise<Post>;
    toggleArchive(id: string, userId: string): Promise<Post>;
    findAllForAdmin(page?: number, limit?: number, options?: {
        reported?: boolean;
        userId?: string;
    }): Promise<{
        posts: {
            isFlagged: boolean;
            reportsCount: number;
            user: {
                id: string;
                email: string;
                name: string;
                avatar: string;
            };
            _count: {
                comments: number;
                likes: number;
            };
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            status: string;
            media: string | null;
            message: string;
            impressions: number;
            views: number;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    moderatePost(id: string, payload: {
        flagged: boolean;
        remove?: boolean;
        reason?: string;
    }): Promise<{
        removed: boolean;
        id: string;
    } | {
        isFlagged: boolean;
        reportsCount: number;
        moderationReason: string;
        user: {
            id: string;
            name: string;
            avatar: string;
        };
        _count: {
            comments: number;
            likes: number;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: string;
        media: string | null;
        message: string;
        impressions: number;
        views: number;
        removed?: undefined;
    }>;
}
