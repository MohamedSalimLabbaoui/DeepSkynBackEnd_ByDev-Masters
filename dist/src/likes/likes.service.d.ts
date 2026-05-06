import { PrismaService } from '../prisma/prisma.service';
import { Like } from '@prisma/client';
export declare class LikesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    like(userId: string, postId: string): Promise<Like>;
    unlike(userId: string, postId: string): Promise<void>;
    toggle(userId: string, postId: string, reactionType?: string): Promise<{
        liked: boolean;
        type: string;
        likesCount: number;
    }>;
    findByPost(postId: string, page?: number, limit?: number): Promise<{
        likes: Like[];
        total: number;
    }>;
    hasLiked(userId: string, postId: string): Promise<boolean>;
}
