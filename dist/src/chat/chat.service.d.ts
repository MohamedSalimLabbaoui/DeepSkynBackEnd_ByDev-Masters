import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../analysis/services/gemini.service';
import { AnalysisService } from '../analysis/analysis.service';
import { SkinProfileService } from '../skin-profile/skin-profile.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { CrawlingService } from '../crawling/crawling.service';
import { CreateChatDto, SendMessageDto } from './dto';
import { ChatHistory } from '@prisma/client';
export interface ChatMessage {
    role: string;
    content: string;
    timestamp: string;
    products?: any[];
}
export interface ChatResponse {
    chatId: string;
    message: ChatMessage;
    isNewChat: boolean;
    products?: any[];
}
export declare class ChatService {
    private readonly prisma;
    private readonly geminiService;
    private readonly skinProfileService;
    private readonly subscriptionService;
    private readonly crawlingService;
    private readonly analysisService;
    private readonly logger;
    private readonly MAX_FREE_MESSAGES;
    constructor(prisma: PrismaService, geminiService: GeminiService, skinProfileService: SkinProfileService, subscriptionService: SubscriptionService, crawlingService: CrawlingService, analysisService: AnalysisService);
    sendMessage(userId: string, sendMessageDto: SendMessageDto): Promise<ChatResponse>;
    private detectProducts;
    create(userId: string, createChatDto: CreateChatDto): Promise<ChatHistory>;
    findAllByUser(userId: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        chats: ChatHistory[];
        total: number;
    }>;
    findOne(id: string, userId: string): Promise<ChatHistory>;
    remove(id: string, userId: string): Promise<void>;
    removeAll(userId: string): Promise<number>;
    private getTodayMessageCount;
    private buildUserContext;
    private generateAIResponse;
    private buildSystemPrompt;
    private formatConversationHistory;
    private getFallbackResponse;
    getStatistics(): Promise<{
        totalChats: number;
        totalMessages: number;
        premiumChats: number;
        averageMessagesPerChat: number;
    }>;
}
