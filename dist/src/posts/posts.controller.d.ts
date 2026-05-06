import { PostsService } from './posts.service';
import { CreatePostDto, UpdatePostDto, FlagPostDto } from './dto';
export declare class PostsController {
    private readonly postsService;
    constructor(postsService: PostsService);
    create(userId: string, createPostDto: CreatePostDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: string;
        media: string | null;
        message: string;
        impressions: number;
        views: number;
    }>;
    findAll(userId: string, page?: number, limit?: number): Promise<any>;
    findAllLegacy(userId: string, page?: number, limit?: number): Promise<any>;
    findByUser(currentUserId: string, userId: string, page?: number, limit?: number): Promise<any>;
    findMyPosts(userId: string, page?: number, limit?: number): Promise<any>;
    findArchives(userId: string, page?: number, limit?: number): Promise<{
        data: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findAllForAdmin(page?: number, limit?: number, reported?: string, userId?: string): Promise<{
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
    flagPost(id: string, flagDto: FlagPostDto): Promise<{
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
    findOne(userId: string, id: string): Promise<import("./posts.service").PostWithDetails>;
    update(userId: string, id: string, updatePostDto: UpdatePostDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: string;
        media: string | null;
        message: string;
        impressions: number;
        views: number;
    }>;
    remove(userId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: string;
        media: string | null;
        message: string;
        impressions: number;
        views: number;
    }>;
    toggleArchive(userId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: string;
        media: string | null;
        message: string;
        impressions: number;
        views: number;
    }>;
}
