import { ConfigService } from '@nestjs/config';
export interface GeminiAnalysisResult {
    skinType: string;
    skinAge: number;
    healthScore: number;
    conditions: string[];
    concerns: string[];
    recommendations: {
        products: string[];
        ingredients: string[];
        lifestyle: string[];
        warnings: string[];
    };
    detailedAnalysis: {
        hydration: {
            score: number;
            description: string;
        };
        texture: {
            score: number;
            description: string;
        };
        pores: {
            score: number;
            description: string;
        };
        pigmentation: {
            score: number;
            description: string;
        };
        wrinkles: {
            score: number;
            description: string;
        };
        acne: {
            score: number;
            description: string;
        };
        redness: {
            score: number;
            description: string;
        };
        elasticity: {
            score: number;
            description: string;
        };
    };
    fitzpatrickType: number;
    summary: string;
}
export interface GeminiResponse {
    candidates: {
        content: {
            parts: {
                text: string;
            }[];
        };
    }[];
}
export interface CosmeticProductAnalysisResult {
    name: string;
    brand: string;
    category: string;
    ingredients: string[];
    benefits: {
        title: string;
        description: string;
        matchPercentage: number;
    }[];
    concerns: {
        title: string;
        description: string;
        severity: 'low' | 'medium' | 'high';
    }[];
    skinTypeCompatibility: {
        skinType: string;
        compatibility: number;
    }[];
    recommendation: string;
}
export declare class GeminiService {
    private readonly configService;
    private readonly logger;
    private readonly geminiApiKeys;
    private readonly geminiModels;
    private readonly geminiBaseUrl;
    private readonly maxRetries;
    private readonly retryDelay;
    private readonly grokService;
    private readonly huggingFaceApiKey;
    private readonly huggingFaceModelUrl;
    constructor(configService: ConfigService);
    private queryHuggingFace;
    private generateHairstyleImage;
    private loadApiKeys;
    private sleep;
    private isRetryableStatus;
    private requestGeminiWithFallback;
    private makeRequestWithRetry;
    analyzeSkinImages(imageUrls: string[], questionnaire?: Record<string, any>): Promise<GeminiAnalysisResult>;
    analyzeSkinImageBuffers(images: {
        buffer: Buffer;
        mimeType?: string;
    }[], questionnaire?: Record<string, any>): Promise<GeminiAnalysisResult>;
    analyzeRealTimeScan(base64Image: string, mimeType?: string): Promise<GeminiAnalysisResult>;
    analyzeRealTimeMultiAngleScan(images: {
        image: string;
        mimeType: string;
    }[]): Promise<GeminiAnalysisResult>;
    private buildAnalysisPrompt;
    private buildRealTimeScanPrompt;
    private prepareImageParts;
    private toNumber;
    private normalizeSkinAge;
    private normalizeHealthScore;
    private normalizeMetric;
    private parseAnalysisResponse;
    getSkincareAdvice(conditions: string[], concerns: string[]): Promise<string>;
    chat(systemPrompt: string, conversationHistory: string, userMessage: string): Promise<string>;
    analyzeCosmeticProductImage(base64Image: string, skinProfile?: {
        skinType?: string;
        concerns?: string[];
        sensitivities?: string[];
    }, mimeType?: string): Promise<CosmeticProductAnalysisResult>;
    private parseCosmeticProductAnalysis;
    private generateHairstyleTransfer;
    analyzeHairAndRecommend(base64Image: string, mimeType?: string): Promise<{
        title: string;
        description: string;
        imageUrl: string;
    }>;
}
