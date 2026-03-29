import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService, GeminiAnalysisResult } from './services/gemini.service';
import { SupabaseService, UploadResult } from './services/supabase.service';
import { SkinProfileService } from '../skin-profile/skin-profile.service';
import { NotificationService } from '../notification/notification.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { RealTimeScanDto } from './dto/real-time-scan.dto';
import { Analysis } from '@prisma/client';
import { Prisma } from '@prisma/client';

export interface AnalysisWithResults extends Analysis {
  geminiResults?: GeminiAnalysisResult;
}

export interface AnalysisStats {
  totalAnalyses: number;
  completedAnalyses: number;
  failedAnalyses: number;
  averageHealthScore: number;
  averageProcessingTime: number;
  topConditions: { condition: string; count: number }[];
}

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  private readonly freeMonthlyAnalysisLimit = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly supabaseService: SupabaseService,
    private readonly skinProfileService: SkinProfileService,
    private readonly notificationService: NotificationService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  private async enforceAnalysisAccess(userId: string): Promise<void> {
    const isPremium = await this.subscriptionService.isPremium(userId);
    if (isPremium) return;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const startOfNextMonth = new Date(startOfMonth);
    startOfNextMonth.setMonth(startOfNextMonth.getMonth() + 1);

    const thisMonthCount = await this.prisma.analysis.count({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
    });

    if (thisMonthCount >= this.freeMonthlyAnalysisLimit) {
      throw new ForbiddenException(
        `Monthly analysis limit reached (${this.freeMonthlyAnalysisLimit}). Resets at ${startOfNextMonth.toISOString()}. Upgrade to premium for unlimited analyses.`,
      );
    }
  }

  /**
   * Create and process a new skin analysis with uploaded images
   */
  async createWithImages(
    userId: string,
    files: Express.Multer.File[],
    questionnaire?: Record<string, any>,
  ): Promise<Analysis> {
    const startTime = Date.now();

    await this.enforceAnalysisAccess(userId);

    // Upload images to Supabase
    let uploadedImages: UploadResult[] = [];
    try {
      uploadedImages = await this.supabaseService.uploadMultipleImages(
        files,
        userId,
        'analyses',
      );
    } catch (error) {
      this.logger.error('Failed to upload images', error);
      throw new BadRequestException('Failed to upload images');
    }

    const imageUrls = uploadedImages.map((img) => img.url);

    // Create analysis record with pending status
    const analysis = await this.prisma.analysis.create({
      data: {
        userId,
        images: imageUrls,
        questionnaire: questionnaire || null,
        status: 'processing',
        conditions: [],
      },
    });

    // Process analysis asynchronously
    this.processAnalysis(
      analysis.id,
      userId,
      imageUrls,
      questionnaire,
      startTime,
    );

    return analysis;
  }

  /**
   * Create analysis from existing image URLs
   */
  async create(
    userId: string,
    createAnalysisDto: CreateAnalysisDto,
  ): Promise<Analysis> {
    const startTime = Date.now();

    await this.enforceAnalysisAccess(userId);

    const analysis = await this.prisma.analysis.create({
      data: {
        userId,
        images: createAnalysisDto.images,
        questionnaire: createAnalysisDto.questionnaire || null,
        status: 'processing',
        conditions: [],
      },
    });

    // Process analysis asynchronously
    this.processAnalysis(
      analysis.id,
      userId,
      createAnalysisDto.images,
      createAnalysisDto.questionnaire,
      startTime,
    );

    return analysis;
  }

  /**
   * Process real-time face scan
   */
  async processRealTimeScan(
    userId: string,
    realTimeScanDto: RealTimeScanDto,
  ): Promise<GeminiAnalysisResult> {
    const startTime = Date.now();

    if (realTimeScanDto.saveAnalysis) {
      await this.enforceAnalysisAccess(userId);
    }

    try {
      // Optionally save the scan image
      let imageUrl: string | null = null;
      if (realTimeScanDto.saveImage) {
        const uploadResult = await this.supabaseService.uploadBase64Image(
          realTimeScanDto.image,
          userId,
          realTimeScanDto.mimeType || 'image/jpeg',
          'scans',
        );
        imageUrl = uploadResult.url;
      }

      // Analyze with Gemini
      const result = await this.geminiService.analyzeRealTimeScan(
        realTimeScanDto.image,
        realTimeScanDto.mimeType || 'image/jpeg',
      );

      const processingTime = Date.now() - startTime;

      // Create analysis record if requested
      if (realTimeScanDto.saveAnalysis) {
        await this.prisma.analysis.create({
          data: {
            userId,
            images: imageUrl ? [imageUrl] : [],
            results: result as any,
            healthScore: result.healthScore,
            skinAge: result.skinAge,
            conditions: result.conditions,
            recommendations: result.recommendations as any,
            status: 'completed',
            processingTime,
          },
        });

        // Update skin profile
        await this.updateSkinProfile(userId, result);
      }

      return result;
    } catch (error) {
      this.logger.error('Real-time scan failed', error);
      throw new BadRequestException('Failed to process scan');
    }
  }

  /**
   * Process the analysis asynchronously
   */
  private async processAnalysis(
    analysisId: string,
    userId: string,
    imageUrls: string[],
    questionnaire: Record<string, any> | null,
    startTime: number,
  ): Promise<void> {
    try {
      // Analyze with Gemini
      const result = await this.geminiService.analyzeSkinImages(
        imageUrls,
        questionnaire,
      );

      const processingTime = Date.now() - startTime;

      // Update analysis with results
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: {
          results: result as any,
          healthScore: result.healthScore,
          skinAge: result.skinAge,
          conditions: result.conditions,
          recommendations: result.recommendations as any,
          status: 'completed',
          processingTime,
        },
      });

      // Update user's skin profile
      await this.updateSkinProfile(userId, result);

      // Send notification
      await this.notificationService.create({
        userId,
        title: 'Analyse terminée',
        message: `Votre analyse de peau est prête. Score de santé: ${result.healthScore}/100`,
        type: 'success',
        actionUrl: `/analyses/${analysisId}`,
      });

      this.logger.log(
        `Analysis ${analysisId} completed in ${processingTime}ms`,
      );
    } catch (error) {
      this.logger.error(`Analysis ${analysisId} failed`, error);

      // Update analysis with failed status
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'failed',
          processingTime: Date.now() - startTime,
        },
      });

      // Send failure notification
      await this.notificationService.create({
        userId,
        title: 'Analyse échouée',
        message:
          "Une erreur s'est produite lors de l'analyse. Veuillez réessayer.",
        type: 'error',
        actionUrl: `/analyses/${analysisId}`,
      });
    }
  }

  /**
   * Update user's skin profile based on analysis results
   */
  private async updateSkinProfile(
    userId: string,
    result: GeminiAnalysisResult,
  ): Promise<void> {
    try {
      const hasProfile = await this.skinProfileService.hasProfile(userId);

      const profileData = {
        skinType: result.skinType,
        fitzpatrickType: result.fitzpatrickType,
        concerns: result.concerns,
        skinAge: result.skinAge,
        healthScore: result.healthScore,
        lastAnalysisAt: new Date().toISOString(),
      };

      if (hasProfile) {
        await this.skinProfileService.update(userId, profileData);
      } else {
        await this.skinProfileService.create(userId, profileData);
      }
    } catch (error) {
      this.logger.error('Failed to update skin profile', error);
    }
  }

  /**
   * Get all analyses for a user
   */
  async findAllByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ analyses: Analysis[]; total: number }> {
    const skip = (page - 1) * limit;

    const [analyses, total] = await Promise.all([
      this.prisma.analysis.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.analysis.count({ where: { userId } }),
    ]);

    return { analyses, total };
  }

  async findAllForAdmin(options: {
    page?: number;
    limit?: number;
    fromDate?: string;
    toDate?: string;
    skinType?: string;
    minScore?: number;
    maxScore?: number;
    status?: string;
  }) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AnalysisWhereInput = {
      ...(options.status ? { status: options.status } : {}),
      ...(options.minScore !== undefined || options.maxScore !== undefined
        ? {
            healthScore: {
              ...(options.minScore !== undefined ? { gte: options.minScore } : {}),
              ...(options.maxScore !== undefined ? { lte: options.maxScore } : {}),
            },
          }
        : {}),
      ...(options.fromDate || options.toDate
        ? {
            createdAt: {
              ...(options.fromDate ? { gte: new Date(options.fromDate) } : {}),
              ...(options.toDate ? { lte: new Date(options.toDate) } : {}),
            },
          }
        : {}),
      ...(options.skinType
        ? { user: { skinProfile: { is: { skinType: options.skinType } } } }
        : {}),
    };

    const [analyses, total] = await Promise.all([
      this.prisma.analysis.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              skinProfile: {
                select: {
                  skinType: true,
                  healthScore: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.analysis.count({ where }),
    ]);

    return { analyses, total, page, limit };
  }

  /**
   * Get analysis by ID
   */
  async findById(id: string, userId: string): Promise<Analysis> {
    const analysis = await this.prisma.analysis.findFirst({
      where: { id, userId },
    });

    if (!analysis) {
      throw new NotFoundException(`Analysis with ID ${id} not found`);
    }

    return analysis;
  }

  /**
   * Get latest analysis for a user
   */
  async findLatest(userId: string): Promise<Analysis | null> {
    return this.prisma.analysis.findFirst({
      where: { userId, status: 'completed' },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retry failed analysis
   */
  async retryAnalysis(id: string, userId: string): Promise<Analysis> {
    const analysis = await this.findById(id, userId);

    if (analysis.status !== 'failed') {
      throw new BadRequestException('Only failed analyses can be retried');
    }

    // Update status to processing
    await this.prisma.analysis.update({
      where: { id },
      data: { status: 'processing' },
    });

    // Reprocess
    const startTime = Date.now();
    this.processAnalysis(
      id,
      userId,
      analysis.images,
      analysis.questionnaire as Record<string, any>,
      startTime,
    );

    return this.findById(id, userId);
  }

  async retryAnalysisForAdmin(id: string): Promise<Analysis> {
    const analysis = await this.prisma.analysis.findUnique({ where: { id } });

    if (!analysis) {
      throw new NotFoundException(`Analysis with ID ${id} not found`);
    }

    if (analysis.status !== 'failed') {
      throw new BadRequestException('Only failed analyses can be retried');
    }

    await this.prisma.analysis.update({
      where: { id },
      data: { status: 'processing' },
    });

    const startTime = Date.now();
    this.processAnalysis(
      id,
      analysis.userId,
      analysis.images,
      analysis.questionnaire as Record<string, any>,
      startTime,
    );

    return this.prisma.analysis.findUnique({ where: { id } }) as Promise<Analysis>;
  }

  /**
   * Delete analysis and associated images
   */
  async remove(id: string, userId: string): Promise<Analysis> {
    const analysis = await this.findById(id, userId);

    // Delete images from Supabase
    const imagePaths = analysis.images
      .map((url) => this.supabaseService.extractPathFromUrl(url))
      .filter((path): path is string => path !== null);

    await this.supabaseService.deleteMultipleImages(imagePaths);

    // Delete analysis record
    return this.prisma.analysis.delete({
      where: { id },
    });
  }

  /**
   * Get analysis statistics for a user
   */
  async getUserStats(userId: string): Promise<{
    totalAnalyses: number;
    averageHealthScore: number;
    healthScoreHistory: { date: Date; score: number }[];
    commonConditions: string[];
  }> {
    const analyses = await this.prisma.analysis.findMany({
      where: { userId, status: 'completed' },
      orderBy: { createdAt: 'asc' },
      select: {
        healthScore: true,
        conditions: true,
        createdAt: true,
      },
    });

    const healthScores = analyses
      .filter((a) => a.healthScore !== null)
      .map((a) => a.healthScore as number);

    const averageHealthScore =
      healthScores.length > 0
        ? Math.round(
            healthScores.reduce((a, b) => a + b, 0) / healthScores.length,
          )
        : 0;

    const conditionCount: Record<string, number> = {};
    analyses.forEach((a) => {
      a.conditions.forEach((c) => {
        conditionCount[c] = (conditionCount[c] || 0) + 1;
      });
    });

    const commonConditions = Object.entries(conditionCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([condition]) => condition);

    const healthScoreHistory = analyses
      .filter((a) => a.healthScore !== null)
      .map((a) => ({
        date: a.createdAt,
        score: a.healthScore as number,
      }));

    return {
      totalAnalyses: analyses.length,
      averageHealthScore,
      healthScoreHistory,
      commonConditions,
    };
  }

  /**
   * Get admin statistics
   */
  async getStatistics(): Promise<AnalysisStats> {
    const analyses = await this.prisma.analysis.findMany();

    const completed = analyses.filter((a) => a.status === 'completed');
    const failed = analyses.filter((a) => a.status === 'failed');

    const healthScores = completed
      .filter((a) => a.healthScore !== null)
      .map((a) => a.healthScore as number);

    const processingTimes = completed
      .filter((a) => a.processingTime !== null)
      .map((a) => a.processingTime as number);

    const conditionCount: Record<string, number> = {};
    completed.forEach((a) => {
      a.conditions.forEach((c) => {
        conditionCount[c] = (conditionCount[c] || 0) + 1;
      });
    });

    const topConditions = Object.entries(conditionCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([condition, count]) => ({ condition, count }));

    return {
      totalAnalyses: analyses.length,
      completedAnalyses: completed.length,
      failedAnalyses: failed.length,
      averageHealthScore:
        healthScores.length > 0
          ? Math.round(
              healthScores.reduce((a, b) => a + b, 0) / healthScores.length,
            )
          : 0,
      averageProcessingTime:
        processingTimes.length > 0
          ? Math.round(
              processingTimes.reduce((a, b) => a + b, 0) /
                processingTimes.length,
            )
          : 0,
      topConditions,
    };
  }

  /**
   * Get skincare advice based on latest analysis
   */
  async getAdvice(userId: string): Promise<string> {
    const latestAnalysis = await this.findLatest(userId);

    if (!latestAnalysis) {
      return 'Effectuez une analyse de peau pour recevoir des conseils personnalisés.';
    }

    const results =
      latestAnalysis.results as unknown as GeminiAnalysisResult | null;
    if (!results) {
      return 'Effectuez une nouvelle analyse pour recevoir des conseils personnalisés.';
    }

    return this.geminiService.getSkincareAdvice(
      latestAnalysis.conditions,
      results.concerns || [],
    );
  }

  /**
   * Compare two analyses
   */
  async compareAnalyses(
    userId: string,
    analysisId1: string,
    analysisId2: string,
  ): Promise<{
    analysis1: Analysis;
    analysis2: Analysis;
    comparison: {
      healthScoreChange: number;
      skinAgeChange: number;
      newConditions: string[];
      resolvedConditions: string[];
    };
  }> {
    const [analysis1, analysis2] = await Promise.all([
      this.findById(analysisId1, userId),
      this.findById(analysisId2, userId),
    ]);

    const healthScoreChange =
      (analysis2.healthScore || 0) - (analysis1.healthScore || 0);
    const skinAgeChange = (analysis2.skinAge || 0) - (analysis1.skinAge || 0);

    const conditions1 = new Set(analysis1.conditions);
    const conditions2 = new Set(analysis2.conditions);

    const newConditions = [...conditions2].filter((c) => !conditions1.has(c));
    const resolvedConditions = [...conditions1].filter(
      (c) => !conditions2.has(c),
    );

    return {
      analysis1,
      analysis2,
      comparison: {
        healthScoreChange,
        skinAgeChange,
        newConditions,
        resolvedConditions,
      },
    };
  }
}
