import { LikesService } from './likes.service';
export declare class LikesController {
    private readonly likesService;
    constructor(likesService: LikesService);
    toggle(userId: string, postId: string, type?: string): Promise<{
        liked: boolean;
        type: string;
        likesCount: number;
    }>;
    like(userId: string, postId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        postId: string;
    }>;
    unlike(userId: string, postId: string): Promise<void>;
    findByPost(postId: string, page?: number, limit?: number): Promise<{
        likes: import(".prisma/client").Like[];
        total: number;
    }>;
    findReactionsLegacy(postId: string, page?: number, limit?: number): Promise<{
        likes: import(".prisma/client").Like[];
        total: number;
    }>;
    hasLiked(userId: string, postId: string): Promise<{
        liked: boolean;
    }>;
}
