import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../analysis/services/gemini.service';
import { SkinProfileService } from '../skin-profile/skin-profile.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { CrawlingService } from '../crawling/crawling.service';
import {
  CreateChatDto,
  SendMessageDto,
  MessageRole,
  ChatMessageDto,
} from './dto';
import { ChatHistory } from '@prisma/client';

export interface ChatMessage {
  role: string;
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  chatId: string;
  message: ChatMessage;
  isNewChat: boolean;
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
        throw new ForbiddenException(
          `Limite de ${this.MAX_FREE_MESSAGES} messages/jour atteinte. Passez à Premium pour des conversations illimitées.`,
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

    // Générer la réponse AI
    const aiResponse = await this.generateAIResponse(
      messages,
      context,
      isPremium,
    );

    const assistantMessage: ChatMessage = {
      role: MessageRole.ASSISTANT,
      content: aiResponse,
      timestamp: new Date().toISOString(),
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
    };
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
      context.skinProfile = {
        skinType: skinProfile.skinType,
        fitzpatrickType: skinProfile.fitzpatrickType,
        concerns: skinProfile.concerns,
        sensitivities: skinProfile.sensitivities,
        healthScore: skinProfile.healthScore,
        skinAge: skinProfile.skinAge,
      };
    } catch {
      // Pas de profil de peau, continuer sans
    }

    return context;
  }

  /**
   * Générer une réponse AI avec Gemini, enrichie par les articles crawlés
   */
  private async generateAIResponse(
    messages: ChatMessage[],
    context: Record<string, any>,
    isPremium: boolean,
  ): Promise<string> {
    const lastUserMessage = messages[messages.length - 1]?.content || '';

    // Enrichir le contexte avec des articles dermatologiques pertinents
    let articlesContext = '';
    try {
      const relevantArticles = await this.crawlingService.getRelevantArticles(lastUserMessage, 3);
      if (relevantArticles.length > 0) {
        articlesContext = '\n\nRéférences dermatologiques récentes à utiliser pour enrichir ta réponse:\n' +
          relevantArticles.map((a, i) => 
            `${i + 1}. [${a.source}] "${a.title}"\n   ${a.summary}`
          ).join('\n');
      }
    } catch (error) {
      this.logger.warn('Impossible de récupérer les articles pour le contexte AI', error.message);
    }

    const systemPrompt = this.buildSystemPrompt(context, isPremium, articlesContext);
    const conversationHistory = this.formatConversationHistory(messages.slice(0, -1)); // Exclude last user message

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
    articlesContext: string = '',
  ): string {
    let prompt = `Tu es DeepSkyn AI, un assistant expert en dermatologie et soins de la peau. 
Tu fournis des conseils personnalisés, bienveillants et basés sur des connaissances dermatologiques.
Réponds toujours en français de manière professionnelle mais accessible.
Tu t'appuies sur des articles médicaux récents pour fournir des informations à jour.`;

    if (context.skinProfile) {
      prompt += `\n\nProfil de peau de l'utilisateur:
- Type de peau: ${context.skinProfile.skinType || 'Non spécifié'}
- Type Fitzpatrick: ${context.skinProfile.fitzpatrickType || 'Non spécifié'}
- Préoccupations: ${context.skinProfile.concerns?.join(', ') || 'Aucune'}
- Sensibilités: ${context.skinProfile.sensitivities?.join(', ') || 'Aucune'}
- Score de santé: ${context.skinProfile.healthScore || 'Non évalué'}/100`;
    }

    if (isPremium) {
      prompt += `\n\nL'utilisateur est Premium. Tu peux fournir des réponses détaillées avec:
- Recommandations de produits spécifiques
- Routines personnalisées complètes
- Explications approfondies des ingrédients
- Conseils avancés`;
    } else {
      prompt += `\n\nL'utilisateur est en plan gratuit. Fournis des conseils généraux et suggère 
de passer à Premium pour des recommandations plus détaillées quand c'est pertinent.`;
    }

    // Ajouter le contexte des articles crawlés
    if (articlesContext) {
      prompt += articlesContext;
    }

    return prompt;
  }

  /**
   * Formater l'historique de conversation
   */
  private formatConversationHistory(messages: ChatMessage[]): string {
    if (messages.length === 0) return '';

    const recent = messages.slice(-10); // Garder les 10 derniers messages
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
Votre question a été enregistrée et je vous répondrai dès que possible. 
En attendant, n'hésitez pas à consulter nos routines personnalisées ou à refaire une analyse de peau.`;
    }
    return `Je suis temporairement indisponible. Réessayez dans quelques instants. 
Pour un service prioritaire, pensez à notre abonnement Premium !`;
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
