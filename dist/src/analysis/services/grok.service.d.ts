import { ConfigService } from '@nestjs/config';
export interface GrokChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export declare class GrokService {
    private readonly configService;
    private readonly logger;
    private readonly openRouterKeys;
    private readonly openRouterBaseUrl;
    private readonly groqApiKeys;
    private readonly groqBaseUrl;
    private readonly groqTextModel;
    private readonly textModel;
    private readonly visionModel;
    private readonly maxRetries;
    private readonly retryDelay;
    private readonly cooldownMs;
    private readonly cooldownMap;
    private readonly disabledModels;
    private readonly textRotationBase;
    private readonly visionRotationBase;
    constructor(configService: ConfigService);
    private loadApiKeys;
    isAvailable(): Promise<boolean>;
    getAvailableModels(): Promise<string[]>;
    private sleep;
    private getCompletionUrl;
    private getGroqCompletionUrl;
    private cleanExpiredCooldowns;
    getCooldownModels(): string[];
    private markModelCooldown;
    private removeModelForSession;
    private getRotationModels;
    private requestCompletion;
    private requestGroqCompletion;
    generate(prompt: string, model?: string): Promise<string>;
    chat(messages: GrokChatMessage[], model?: string): Promise<string>;
    analyzeImage(base64Image: string, prompt: string, model?: string): Promise<string>;
    getSkincareAdvice(conditions: string[], concerns: string[]): Promise<string>;
    chatSkincare(systemPrompt: string, conversationHistory: string, userMessage: string): Promise<string>;
}
