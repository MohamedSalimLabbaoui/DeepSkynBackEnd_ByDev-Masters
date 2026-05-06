import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto, UpdateCommentDto } from './dto';
import { Comment } from '@prisma/client';
export interface CommentWithUser extends Comment {
    user: {
        id: string;
        name: string | null;
        avatar: string | null;
    };
    _count?: {
        likes: number;
        replies?: number;
    };
    isLiked?: boolean;
}
export declare class CommentsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(userId: string, createCommentDto: CreateCommentDto): Promise<CommentWithUser>;
    findByPost(postId: string, page?: number, limit?: number, currentUserId?: string): Promise<{
        data: CommentWithUser[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findReplies(parentId: string, currentUserId?: string): Promise<CommentWithUser[]>;
    findOne(id: string, currentUserId?: string): Promise<CommentWithUser>;
    toggleLike(commentId: string, userId: string): Promise<{
        liked: boolean;
    }>;
    update(id: string, userId: string, updateCommentDto: UpdateCommentDto): Promise<CommentWithUser>;
    remove(id: string, userId: string): Promise<void>;
    countByPost(postId: string): Promise<number>;
}
