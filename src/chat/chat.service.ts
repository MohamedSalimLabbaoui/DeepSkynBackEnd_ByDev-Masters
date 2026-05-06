import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../analysis/services/gemini.service';
import { AnalysisService } from '../analysis/analysis.service';
import { SkinProfileService } from '../skin-profile/skin-profile.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { CrawlingService } from '../crawling/crawling.service';
import { CreateChatDto, SendMessageDto, MessageRole } from './dto';
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

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly MAX_FREE_MESSAGES = 10; // Messages gratuits par jour

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly skinProfileService: SkinProfileService,
    private readonly subscriptionService: SubscriptionService,
    private readonly crawlingService: CrawlingService,
    private readonly analysisService: AnalysisService,
  ) {}

  /**
   * Envoyer un message et obtenir une réponse AI
   */
  async sendMessage(
    userId: string,
    sendMessageDto: SendMessageDto,
  ): Promise<ChatResponse> {
    // Vérifier les limites pour les utilisateurs gratuits
    const isPremium = await this.subscriptionService.isPremium(userId);

    if (!isPremium) {
      const todayMessages = await this.getTodayMessageCount(userId);
      if (todayMessages >= this.MAX_FREE_MESSAGES) {
        const startOfTomorrow = new Date();
        startOfTomorrow.setHours(23, 59, 59, 999);
        throw new ForbiddenException(
          `Limite de ${this.MAX_FREE_MESSAGES} messages/jour atteinte. Réinitialisation à minuit. Passez à Premium pour des conversations illimitées.`,
        );
      }
    }

    let chat: ChatHistory;
    let isNewChat = false;

    // Récupérer ou créer le chat
    if (sendMessageDto.chatId) {
      chat = await this.findOne(sendMessageDto.chatId, userId);
    } else {
      chat = await this.create(userId, {
        messages: [],
        isPremium,
      });
      isNewChat = true;
    }

    // Obtenir le contexte utilisateur (skin profile)
    const context = await this.buildUserContext(userId, sendMessageDto.context);

    // Ajouter le message utilisateur
    const userMessage: ChatMessage = {
      role: MessageRole.USER,
      content: sendMessageDto.message,
      timestamp: new Date().toISOString(),
    };

    const messages = (chat.messages as unknown as ChatMessage[]) || [];
    messages.push(userMessage);

    // If the user explicitly asks about their score or analysis details, answer deterministically
    const userText = (sendMessageDto.message || '').toLowerCase();
    const isScoreQuery =
      /\b(score|mon score|combien|quel est mon score|sant[eé]?)\b/i.test(
        userText,
      );
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
    const isAnalysisDetailQuery = analysisDetailKeywords.some((k) =>
      userText.includes(k),
    );

    if (isScoreQuery || isAnalysisDetailQuery) {
      try {
        // try fetch latest analysis for user
        const latest = await this.analysisService.findLatest(userId);

        if (isScoreQuery) {
          const score =
            latest?.healthScore ?? context.skinProfile?.healthScore ?? null;
          if (typeof score === 'number') {
            const interpretation =
              score >= 80
                ? 'Excellent'
                : score >= 60
                  ? 'Bon'
                  : score >= 40
                    ? 'Moyen'
                    : 'A améliorer';
            const content = `Votre score de santé cutanée est ${Math.round(score)}/100. Interprétation: ${interpretation}.`;

            const assistantMessage: ChatMessage = {
              role: MessageRole.ASSISTANT,
              content,
              timestamp: new Date().toISOString(),
            };

            messages.push(assistantMessage);
            await this.prisma.chatHistory.update({
              where: { id: chat.id },
              data: { messages: messages as any, context: context as any },
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
          // try to pull detailedAnalysis
          const results: any = latest.results || {};
          const detailed =
            results.detailedAnalysis ||
            (results.detailedAnalysis === undefined
              ? null
              : results.detailedAnalysis);

          // map keywords to fields
          const mapping: Record<string, string> = {
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

          let foundField: string | null = null;
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
            } else if (detailed && detailed[foundField]) {
              const item = detailed[foundField];
              if (
                typeof item === 'object' &&
                ('score' in item || 'description' in item || 'score' in item)
              ) {
                const scoreText =
                  item.score !== undefined ? `Score: ${item.score}/100.` : '';
                const desc = item.description ? ` ${item.description}` : '';
                content = `${scoreText}${desc}`.trim();
              } else if (typeof item === 'number') {
                content = `Valeur: ${item}`;
              } else if (typeof item === 'string') {
                content = item;
              }
            }
          }

          if (content) {
            const assistantMessage: ChatMessage = {
              role: MessageRole.ASSISTANT,
              content,
              timestamp: new Date().toISOString(),
            };
            messages.push(assistantMessage);
            await this.prisma.chatHistory.update({
              where: { id: chat.id },
              data: { messages: messages as any, context: context as any },
            });
            return {
              chatId: chat.id,
              message: assistantMessage,
              isNewChat,
              products: [],
            };
          }
        }
      } catch (err) {
        // if deterministic handling fails, fall back to normal AI flow
        this.logger.warn(
          'Deterministic answer handler failed, falling back to AI',
          err?.message || err,
        );
      }
    }

    // Générer la réponse AI
    const aiResponse = await this.generateAIResponse(
      messages,
      context,
      isPremium,
    );

    // Détecter les produits recommandés
    const recommendedProducts = await this.detectProducts(aiResponse);

    const assistantMessage: ChatMessage = {
      role: MessageRole.ASSISTANT,
      content: aiResponse,
      timestamp: new Date().toISOString(),
      products: recommendedProducts,
    };

    messages.push(assistantMessage);

    // Sauvegarder le chat mis à jour
    await this.prisma.chatHistory.update({
      where: { id: chat.id },
      data: {
        messages: messages as any,
        context: context as any,
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

  /**
   * Détecter les produits dans le texte et récupérer leurs infos
   */
  private async detectProducts(text: string): Promise<any[]> {
    const productRegex = /\[PRODUCT:\s*([^\]]+)\]/gi;
    const matches = [...text.matchAll(productRegex)];

    if (matches.length === 0) return [];

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
      } else {
        products.push({
          name: productName,
          brand: 'Skincare',
          imageUrl:
            'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=200&h=200&auto=format&fit=crop',
        });
      }
    }

    return Array.from(new Map(products.map((p) => [p.name, p])).values());
  }

  /**
   * Créer un nouveau chat
   */
  async create(
    userId: string,
    createChatDto: CreateChatDto,
  ): Promise<ChatHistory> {
    const chat = await this.prisma.chatHistory.create({
      data: {
        userId,
        messages: (createChatDto.messages || []) as any,
        context: createChatDto.context as any,
        isPremium: createChatDto.isPremium ?? false,
      },
    });

    this.logger.log(`Chat created: ${chat.id} for user ${userId}`);
    return chat;
  }

  /**
   * Obtenir tous les chats d'un utilisateur
   */
  async findAllByUser(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ chats: ChatHistory[]; total: number }> {
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

  /**
   * Obtenir un chat spécifique
   */
  async findOne(id: string, userId: string): Promise<ChatHistory> {
    const chat = await this.prisma.chatHistory.findFirst({
      where: { id, userId },
    });

    if (!chat) {
      throw new NotFoundException(`Chat ${id} not found`);
    }

    return chat;
  }

  /**
   * Supprimer un chat
   */
  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);

    await this.prisma.chatHistory.delete({
      where: { id },
    });

    this.logger.log(`Chat ${id} deleted`);
  }

  /**
   * Supprimer tous les chats d'un utilisateur
   */
  async removeAll(userId: string): Promise<number> {
    const result = await this.prisma.chatHistory.deleteMany({
      where: { userId },
    });

    this.logger.log(`Deleted ${result.count} chats for user ${userId}`);
    return result.count;
  }

  /**
   * Obtenir le nombre de messages envoyés aujourd'hui
   */
  private async getTodayMessageCount(userId: string): Promise<number> {
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
      const messages = chat.messages as unknown as ChatMessage[];
      if (Array.isArray(messages)) {
        count += messages.filter(
          (m) => m.role === MessageRole.USER && new Date(m.timestamp) >= today,
        ).length;
      }
    }

    return count;
  }

  /**
   * Construire le contexte utilisateur pour l'AI
   */
  private async buildUserContext(
    userId: string,
    additionalContext?: Record<string, any>,
  ): Promise<Record<string, any>> {
    const context: Record<string, any> = {
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
    } catch {
      // Pas de profil de peau, continuer sans
    }

    // Attach latest analysis summary if available (helps answering detail questions deterministically)
    try {
      const latestAnalysis = await this.analysisService.findLatest(userId);
      if (latestAnalysis) {
        const results = (latestAnalysis.results as any) || {};
        context.latestAnalysis = {
          id: latestAnalysis.id,
          createdAt: latestAnalysis.createdAt,
          healthScore:
            latestAnalysis.healthScore ?? results.healthScore ?? null,
          skinAge: latestAnalysis.skinAge ?? results.skinAge ?? null,
          skinType: results.skinType || null,
          detailed: results.detailedAnalysis || results.detailed || null,
          recommendations: results.recommendations || null,
          summary: results.summary || null,
        };
      }
    } catch {
      // ignore analysis fetch failures
    }

    return context;
  }

  /**
   * Générer la réponse AI avec Gemini, enrichie par les articles crawlés (RAG)
   */
  private async generateAIResponse(
    messages: ChatMessage[],
    context: Record<string, any>,
    isPremium: boolean,
  ): Promise<string> {
    const lastUserMessage = messages[messages.length - 1]?.content || '';

    let relevantArticles: any[] = [];
    try {
      relevantArticles = await this.crawlingService.getRelevantArticles(
        lastUserMessage,
        2,
      );
    } catch (error) {
      this.logger.warn('Failed to fetch relevant articles', error.message);
    }

    const systemPrompt = this.buildSystemPrompt(
      context,
      isPremium,
      relevantArticles,
    );
    const conversationHistory = this.formatConversationHistory(
      messages.slice(0, -1),
    );

    try {
      const response = await this.geminiService.chat(
        systemPrompt,
        conversationHistory,
        lastUserMessage,
      );
      return response;
    } catch (error) {
      this.logger.error('Failed to generate AI response', error.message);
      return this.getFallbackResponse(isPremium);
    }
  }

  /**
   * Construire le prompt système
   */
  private buildSystemPrompt(
    context: Record<string, any>,
    isPremium: boolean,
    articles: any[] = [],
  ): string {
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
    } else {
      prompt += `\nMode Gratuit: Donne des conseils généraux. Suggère le Premium pour des produits précis.`;
    }

    return prompt;
  }

  /**
   * Formater l'historique de conversation
   */
  private formatConversationHistory(messages: ChatMessage[]): string {
    if (messages.length === 0) return '';

    const recent = messages.slice(-10);
    return recent
      .map(
        (m) =>
          `${m.role === MessageRole.USER ? 'Utilisateur' : 'Assistant'}: ${m.content}`,
      )
      .join('\n');
  }

  /**
   * Réponse de fallback en cas d'erreur
   */
  private getFallbackResponse(isPremium: boolean): string {
    if (isPremium) {
      return `Je suis désolé, je rencontre actuellement des difficultés techniques. 
Votre question a été enregistrée et je vous répondrai dès que possible.`;
    }
    return `Je suis temporairement indisponible. Réessayez dans quelques instants.`;
  }

  /**
   * Obtenir des statistiques de chat (admin)
   */
  async getStatistics(): Promise<{
    totalChats: number;
    totalMessages: number;
    premiumChats: number;
    averageMessagesPerChat: number;
  }> {
    const chats = await this.prisma.chatHistory.findMany();

    let totalMessages = 0;
    for (const chat of chats) {
      const messages = chat.messages as unknown as ChatMessage[];
      if (Array.isArray(messages)) {
        totalMessages += messages.length;
      }
    }

    return {
      totalChats: chats.length,
      totalMessages,
      premiumChats: chats.filter((c) => c.isPremium).length,
      averageMessagesPerChat:
        chats.length > 0 ? Math.round(totalMessages / chats.length) : 0,
    };
  }
}
