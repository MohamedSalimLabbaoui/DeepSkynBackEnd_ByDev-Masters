import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto } from './dto';
export declare class CommentsController {
    private readonly commentsService;
    constructor(commentsService: CommentsService);
    create(userId: string, createCommentDto: CreateCommentDto): Promise<import("./comments.service").CommentWithUser>;
    findByPost(userId: string, postId: string, page?: number, limit?: number): Promise<{
        data: import("./comments.service").CommentWithUser[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findReplies(userId: string, id: string): Promise<import("./comments.service").CommentWithUser[]>;
    toggleLike(userId: string, id: string): Promise<{
        liked: boolean;
    }>;
    findOne(userId: string, id: string): Promise<import("./comments.service").CommentWithUser>;
    update(userId: string, id: string, updateCommentDto: UpdateCommentDto): Promise<import("./comments.service").CommentWithUser>;
    remove(userId: string, id: string): Promise<void>;
}
