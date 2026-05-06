import { ChatService } from './chat.service';
import { SendMessageDto } from './dto';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    private resolveUserId;
    sendMessage(req: any, sendMessageDto: SendMessageDto): Promise<import("./chat.service").ChatResponse>;
    getMyChats(req: any, limit?: string, offset?: string): Promise<{
        chats: import(".prisma/client").ChatHistory[];
        total: number;
    }>;
    getChat(req: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        message: string | null;
        imageUrl: string | null;
        modelUsed: string | null;
        assistantResponse: string | null;
        messages: import("@prisma/client/runtime/library").JsonValue | null;
        context: import("@prisma/client/runtime/library").JsonValue | null;
        isPremium: boolean;
    }>;
    deleteChat(req: any, id: string): Promise<void>;
    deleteAllChats(req: any): Promise<{
        deletedCount: number;
    }>;
    getStatistics(): Promise<{
        totalChats: number;
        totalMessages: number;
        premiumChats: number;
        averageMessagesPerChat: number;
    }>;
}
