export declare enum MessageRole {
    USER = "user",
    ASSISTANT = "assistant",
    SYSTEM = "system"
}
export declare class ChatMessageDto {
    role: MessageRole;
    content: string;
    timestamp?: string;
}
export declare class CreateChatDto {
    messages: ChatMessageDto[];
    context?: Record<string, any>;
    isPremium?: boolean;
}
