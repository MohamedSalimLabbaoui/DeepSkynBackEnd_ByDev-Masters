"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const gemini_service_1 = require("../analysis/services/gemini.service");
const analysis_service_1 = require("../analysis/analysis.service");
const skin_profile_service_1 = require("../skin-profile/skin-profile.service");
const subscription_service_1 = require("../subscription/subscription.service");
const crawling_service_1 = require("../crawling/crawling.service");
const dto_1 = require("./dto");
let ChatService = ChatService_1 = class ChatService {
    constructor(prisma, geminiService, skinProfileService, subscriptionService, crawlingService, analysisService) {
        this.prisma = prisma;
        this.geminiService = geminiService;
        this.skinProfileService = skinProfileService;
        this.subscriptionService = subscriptionService;
        this.crawlingService = crawlingService;
        this.analysisService = analysisService;
        this.logger = new common_1.Logger(ChatService_1.name);
        this.MAX_FREE_MESSAGES = 10;
    }
    async sendMessage(userId, sendMessageDto) {
        const isPremium = await this.subscriptionService.isPremium(userId);
        if (!isPremium) {
            const todayMessages = await this.getTodayMessageCount(userId);
            if (todayMessages >= this.MAX_FREE_MESSAGES) {
                const startOfTomorrow = new Date();
                startOfTomorrow.setHours(23, 59, 59, 999);
                throw new common_1.ForbiddenException(`Limite de ${this.MAX_FREE_MESSAGES} messages/jour atteinte. Réinitialisation à minuit. Passez à Premium pour des conversations illimitées.`);
            }
        }
        let chat;
        let isNewChat = false;
        if (sendMessageDto.chatId) {
            chat = await this.findOne(sendMessageDto.chatId, userId);
        }
        else {
            chat = await this.create(userId, {
                messages: [],
                isPremium,
            });
            isNewChat = true;
        }
        const context = await this.buildUserContext(userId, sendMessageDto.context);
        const userMessage = {
            role: dto_1.MessageRole.USER,
            content: sendMessageDto.message,
            timestamp: new Date().toISOString(),
        };
        const messages = chat.messages || [];
        messages.push(userMessage);
        const userText = (sendMessageDto.message || '').toLowerCase();
        const isScoreQuery = /\b(score|mon score|combien|quel est mon score|sant[eé]?)\b/i.test(userText);
        const analysisDetailKeywords = [
            'hydrat',
            'texture',
            'pores',
            'pigment',
            'acn',
            'ride',
            'rougeur',
            'elastic',
            'age cutan',
            'âge cutan',
        ];
        const isAnalysisDetailQuery = analysisDetailKeywords.some((k) => userText.includes(k));
        if (isScoreQuery || isAnalysisDetailQuery) {
            try {
                const latest = await this.analysisService.findLatest(userId);
                if (isScoreQuery) {
                    const score = latest?.healthScore ?? context.skinProfile?.healthScore ?? null;
                    if (typeof score === 'number') {
                        const interpretation = score >= 80
                            ? 'Excellent'
                            : score >= 60
                                ? 'Bon'
                                : score >= 40
                                    ? 'Moyen'
                                    : 'A améliorer';
                        const content = `Votre score de santé cutanée est ${Math.round(score)}/100. Interprétation: ${interpretation}.`;
                        const assistantMessage = {
                            role: dto_1.MessageRole.ASSISTANT,
                            content,
                            timestamp: new Date().toISOString(),
                        };
                        messages.push(assistantMessage);
                        await this.prisma.chatHistory.update({
                            where: { id: chat.id },
                            data: { messages: messages, context: context },
                        });
                        return {
                            chatId: chat.id,
                            message: assistantMessage,
                            isNewChat,
                            products: [],
                        };
                    }
                }
                if (isAnalysisDetailQuery && latest) {
                    const results = latest.results || {};
                    const detailed = results.detailedAnalysis ||
                        (results.detailedAnalysis === undefined
                            ? null
                            : results.detailedAnalysis);
                    const mapping = {
                        hydrat: 'hydration',
                        texture: 'texture',
                        pores: 'pores',
                        pigment: 'pigmentation',
                        acn: 'acne',
                        ride: 'wrinkles',
                        rougeur: 'redness',
                        elastic: 'elasticity',
                        'age cutan': 'skinAge',
                        'âge cutan': 'skinAge',
                    };
                    let foundField = null;
                    for (const k of Object.keys(mapping)) {
                        if (userText.includes(k)) {
                            foundField = mapping[k];
                            break;
                        }
                    }
                    let content = '';
                    if (foundField) {
                        if (foundField === 'skinAge') {
                            const age = latest.skinAge ?? results.skinAge ?? null;
                            if (typeof age === 'number')
                                content = `Votre âge cutané estimé est ${Math.round(age)} ans.`;
                        }
                        else if (detailed && detailed[foundField]) {
                            const item = detailed[foundField];
                            if (typeof item === 'object' &&
                                ('score' in item || 'description' in item || 'score' in item)) {
                                const scoreText = item.score !== undefined ? `Score: ${item.score}/100.` : '';
                                const desc = item.description ? ` ${item.description}` : '';
                                content = `${scoreText}${desc}`.trim();
                            }
                            else if (typeof item === 'number') {
                                content = `Valeur: ${item}`;
                            }
                            else if (typeof item === 'string') {
                                content = item;
                            }
                        }
                    }
                    if (content) {
                        const assistantMessage = {
                            role: dto_1.MessageRole.ASSISTANT,
                            content,
                            timestamp: new Date().toISOString(),
                        };
                        messages.push(assistantMessage);
                        await this.prisma.chatHistory.update({
                            where: { id: chat.id },
                            data: { messages: messages, context: context },
                        });
                        return {
                            chatId: chat.id,
                            message: assistantMessage,
                            isNewChat,
                            products: [],
                        };
                    }
                }
            }
            catch (err) {
                this.logger.warn('Deterministic answer handler failed, falling back to AI', err?.message || err);
            }
        }
        const aiResponse = await this.generateAIResponse(messages, context, isPremium);
        const recommendedProducts = await this.detectProducts(aiResponse);
        const assistantMessage = {
            role: dto_1.MessageRole.ASSISTANT,
            content: aiResponse,
            timestamp: new Date().toISOString(),
            products: recommendedProducts,
        };
        messages.push(assistantMessage);
        await this.prisma.chatHistory.update({
            where: { id: chat.id },
            data: {
                messages: messages,
                context: context,
                isPremium,
            },
        });
        return {
            chatId: chat.id,
            message: assistantMessage,
            isNewChat,
            products: recommendedProducts,
        };
    }
    async detectProducts(text) {
        const productRegex = /\[PRODUCT:\s*([^\]]+)\]/gi;
        const matches = [...text.matchAll(productRegex)];
        if (matches.length === 0)
            return [];
        const products = [];
        for (const match of matches) {
            const productName = match[1].trim();
            const foundProduct = await this.prisma.productScan.findFirst({
                where: {
                    productName: { contains: productName, mode: 'insensitive' },
                    imageUrl: { not: null },
                },
                orderBy: { createdAt: 'desc' },
            });
            if (foundProduct) {
                products.push({
                    id: foundProduct.id,
                    name: foundProduct.productName,
                    brand: foundProduct.brand,
                    imageUrl: foundProduct.imageUrl,
                    category: foundProduct.category,
                });
            }
            else {
                products.push({
                    name: productName,
                    brand: 'Skincare',
                    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=200&h=200&auto=format&fit=crop',
                });
            }
        }
        return Array.from(new Map(products.map((p) => [p.name, p])).values());
    }
    async create(userId, createChatDto) {
        const chat = await this.prisma.chatHistory.create({
            data: {
                userId,
                messages: (createChatDto.messages || []),
                context: createChatDto.context,
                isPremium: createChatDto.isPremium ?? false,
            },
        });
        this.logger.log(`Chat created: ${chat.id} for user ${userId}`);
        return chat;
    }
    async findAllByUser(userId, options) {
        const [chats, total] = await Promise.all([
            this.prisma.chatHistory.findMany({
                where: { userId },
                take: options?.limit || 20,
                skip: options?.offset || 0,
                orderBy: { updatedAt: 'desc' },
            }),
            this.prisma.chatHistory.count({ where: { userId } }),
        ]);
        return { chats, total };
    }
    async findOne(id, userId) {
        const chat = await this.prisma.chatHistory.findFirst({
            where: { id, userId },
        });
        if (!chat) {
            throw new common_1.NotFoundException(`Chat ${id} not found`);
        }
        return chat;
    }
    async remove(id, userId) {
        await this.findOne(id, userId);
        await this.prisma.chatHistory.delete({
            where: { id },
        });
        this.logger.log(`Chat ${id} deleted`);
    }
    async removeAll(userId) {
        const result = await this.prisma.chatHistory.deleteMany({
            where: { userId },
        });
        this.logger.log(`Deleted ${result.count} chats for user ${userId}`);
        return result.count;
    }
    async getTodayMessageCount(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const chats = await this.prisma.chatHistory.findMany({
            where: {
                userId,
                updatedAt: { gte: today },
            },
        });
        let count = 0;
        for (const chat of chats) {
            const messages = chat.messages;
            if (Array.isArray(messages)) {
                count += messages.filter((m) => m.role === dto_1.MessageRole.USER && new Date(m.timestamp) >= today).length;
            }
        }
        return count;
    }
    async buildUserContext(userId, additionalContext) {
        const context = {
            ...additionalContext,
        };
        try {
            const skinProfile = await this.skinProfileService.findByUserId(userId);
            if (skinProfile) {
                context.skinProfile = {
                    skinType: skinProfile.skinType,
                    fitzpatrickType: skinProfile.fitzpatrickType,
                    concerns: skinProfile.concerns,
                    sensitivities: skinProfile.sensitivities,
                    healthScore: skinProfile.healthScore,
                    skinAge: skinProfile.skinAge,
                };
            }
        }
        catch {
        }
        try {
            const latestAnalysis = await this.analysisService.findLatest(userId);
            if (latestAnalysis) {
                const results = latestAnalysis.results || {};
                context.latestAnalysis = {
                    id: latestAnalysis.id,
                    createdAt: latestAnalysis.createdAt,
                    healthScore: latestAnalysis.healthScore ?? results.healthScore ?? null,
                    skinAge: latestAnalysis.skinAge ?? results.skinAge ?? null,
                    skinType: results.skinType || null,
                    detailed: results.detailedAnalysis || results.detailed || null,
                    recommendations: results.recommendations || null,
                    summary: results.summary || null,
                };
            }
        }
        catch {
        }
        return context;
    }
    async generateAIResponse(messages, context, isPremium) {
        const lastUserMessage = messages[messages.length - 1]?.content || '';
        let relevantArticles = [];
        try {
            relevantArticles = await this.crawlingService.getRelevantArticles(lastUserMessage, 2);
        }
        catch (error) {
            this.logger.warn('Failed to fetch relevant articles', error.message);
        }
        const systemPrompt = this.buildSystemPrompt(context, isPremium, relevantArticles);
        const conversationHistory = this.formatConversationHistory(messages.slice(0, -1));
        try {
            const response = await this.geminiService.chat(systemPrompt, conversationHistory, lastUserMessage);
            return response;
        }
        catch (error) {
            this.logger.error('Failed to generate AI response', error.message);
            return this.getFallbackResponse(isPremium);
        }
    }
    buildSystemPrompt(context, isPremium, articles = []) {
        let prompt = `Tu es DeepSkyn AI, un assistant expert en dermatologie. 
Tu fournis des conseils personnalisés, bienveillants et basés sur des connaissances scientifiques.
Réponds toujours en français de manière professionnelle mais accessible.

Règles de style:
- Réponse courte: 2 à 4 phrases.
- Sois direct et évite les politesses excessives.
- RECOMMANDATION PRODUITS : Écris TOUJOURS le nom entre balises : [PRODUCT: Nom].

`;
        if (articles.length > 0) {
            prompt += `\nSources dermatologiques pertinentes:\n`;
            articles.forEach((art) => {
                prompt += `- ${art.title}: ${art.summary}\n`;
            });
            prompt += `\nUtilise ces informations pour renforcer ta réponse.\n`;
        }
        if (context.skinProfile) {
            prompt += `\nProfil utilisateur: Type ${context.skinProfile.skinType || 'normal'}, Fitzpatrick ${context.skinProfile.fitzpatrickType || 3}, Préoccupations: ${context.skinProfile.concerns?.join(', ') || 'aucune'}.`;
            if (typeof context.skinProfile.healthScore === 'number') {
                prompt += `\nScore de santé actuel: ${context.skinProfile.healthScore}/100.`;
            }
            if (typeof context.skinProfile.skinAge === 'number') {
                prompt += `\nÂge cutané estimé: ${context.skinProfile.skinAge} ans.`;
            }
        }
        prompt += `\nRègle importante: si l'utilisateur demande son score, son score de santé, ou "combien" il a, réponds directement avec le score exact en /100 si disponible, puis une courte interprétation. N'utilise jamais une réponse vague comme "non".`;
        if (isPremium) {
            prompt += `\nMode Premium activé: Tu peux recommander des produits spécifiques et des routines complètes.`;
        }
        else {
            prompt += `\nMode Gratuit: Donne des conseils généraux. Suggère le Premium pour des produits précis.`;
        }
        return prompt;
    }
    formatConversationHistory(messages) {
        if (messages.length === 0)
            return '';
        const recent = messages.slice(-10);
        return recent
            .map((m) => `${m.role === dto_1.MessageRole.USER ? 'Utilisateur' : 'Assistant'}: ${m.content}`)
            .join('\n');
    }
    getFallbackResponse(isPremium) {
        if (isPremium) {
            return `Je suis désolé, je rencontre actuellement des difficultés techniques. 
Votre question a été enregistrée et je vous répondrai dès que possible.`;
        }
        return `Je suis temporairement indisponible. Réessayez dans quelques instants.`;
    }
    async getStatistics() {
        const chats = await this.prisma.chatHistory.findMany();
        let totalMessages = 0;
        for (const chat of chats) {
            const messages = chat.messages;
            if (Array.isArray(messages)) {
                totalMessages += messages.length;
            }
        }
        return {
            totalChats: chats.length,
            totalMessages,
            premiumChats: chats.filter((c) => c.isPremium).length,
            averageMessagesPerChat: chats.length > 0 ? Math.round(totalMessages / chats.length) : 0,
        };
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = ChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        gemini_service_1.GeminiService,
        skin_profile_service_1.SkinProfileService,
        subscription_service_1.SubscriptionService,
        crawling_service_1.CrawlingService,
        analysis_service_1.AnalysisService])
], ChatService);
//# sourceMappingURL=chat.service.js.map