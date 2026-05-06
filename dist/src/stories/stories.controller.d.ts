import { StoriesService } from './stories.service';
import { CreateStoryDto } from './dto/create-story.dto';
export declare class StoriesController {
    private readonly storiesService;
    constructor(storiesService: StoriesService);
    private resolveUserId;
    create(req: any, createStoryDto: CreateStoryDto): Promise<{
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
    findAll(req: any): Promise<{
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
    toggleLike(req: any, storyId: string): Promise<{
        liked: boolean;
        likesCount: number;
    }>;
    addComment(req: any, storyId: string, body: {
        comment: string;
    }): Promise<{
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
    deleteComment(req: any, commentId: string): Promise<{
        deleted: boolean;
    }>;
    getUserHighlights(userId: string): Promise<unknown[]>;
    saveAsHighlight(req: any, storyId: string, body: {
        highlightTitle?: string;
    }): Promise<{
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
    removeFromHighlight(req: any, storyId: string): Promise<{
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
    getFreeMusic(): Promise<any>;
    searchFreeMusic(query?: string): Promise<any>;
}
