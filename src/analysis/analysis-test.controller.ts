import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  OnModuleInit,
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { AnalysisService } from './analysis.service';
import { GeminiService, GeminiAnalysisResult } from './services/gemini.service';
import { SupabaseService, UploadResult } from './services/supabase.service';
import { RealTimeScanDto } from './dto/real-time-scan.dto';
import { Analysis } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Test controller for analysis endpoints (NO AUTHENTICATION)
 * WARNING: Remove this controller in production!
 */
@Controller('test/analyses')
export class AnalysisTestController implements OnModuleInit {
  private testUserId: string;

  constructor(
    private readonly analysisService: AnalysisService,
    private readonly geminiService: GeminiService,
    private readonly supabaseService: SupabaseService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    // Create or get test user on module init
    const testEmail = 'test@deepskyn.com';
    let testUser = await this.prisma.user.findUnique({
      where: { email: testEmail },
    });

    if (!testUser) {
      testUser = await this.prisma.user.create({
        data: {
          email: testEmail,
          name: 'Test User',
          emailVerified: true,
          role: 'user',
        },
      });
      console.log(`Test user created with ID: ${testUser.id}`);
    }

    this.testUserId = testUser.id;
    console.log(`Using test user ID: ${this.testUserId}`);
  }

  /**
   * Test image upload to Supabase
   * POST /test/analyses/upload-image
   * Body: form-data with "image" file
   */
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('image'))
  async testUploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResult> {
    return this.supabaseService.uploadImage(file, this.testUserId, 'test');
  }

  /**
   * Test multiple images upload to Supabase
   * POST /test/analyses/upload-images
   * Body: form-data with "images" files (max 5)
   */
  @Post('upload-images')
  @UseInterceptors(FilesInterceptor('images', 5))
  async testUploadImages(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<UploadResult[]> {
    return this.supabaseService.uploadMultipleImages(files, this.testUserId, 'test');
  }

  /**
   * Test full analysis with image uploads
   * POST /test/analyses/analyze
   * Body: form-data with "images" files (1-5 images)
   * Optional: "questionnaire" as JSON string
   */
  @Post('analyze')
  @UseInterceptors(FilesInterceptor('images', 5))
  async testAnalyze(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('questionnaire') questionnaire?: string,
  ): Promise<Analysis> {
    const parsedQuestionnaire = questionnaire ? JSON.parse(questionnaire) : undefined;
    return this.analysisService.createWithImages(this.testUserId, files, parsedQuestionnaire);
  }

  /**
   * Test Gemini analysis directly with image URLs
   * POST /test/analyses/gemini
   * Body: { "imageUrls": ["url1", "url2"], "questionnaire": {} }
   */
  @Post('gemini')
  async testGeminiAnalysis(
    @Body('imageUrls') imageUrls: string[],
    @Body('questionnaire') questionnaire?: Record<string, any>,
  ): Promise<GeminiAnalysisResult> {
    return this.geminiService.analyzeSkinImages(imageUrls, questionnaire);
  }

  /**
   * Test real-time scan with base64 image
   * POST /test/analyses/scan
   * Body: { "image": "base64string", "mimeType": "image/jpeg" }
   */
  @Post('scan')
  async testRealTimeScan(
    @Body() realTimeScanDto: RealTimeScanDto,
  ): Promise<GeminiAnalysisResult> {
    return this.analysisService.processRealTimeScan(this.testUserId, {
      ...realTimeScanDto,
      saveImage: false,
      saveAnalysis: false,
    });
  }

  /**
   * Test Gemini connection
   * POST /test/analyses/ping
   */
  @Post('ping')
  async testGeminiPing(): Promise<{ status: string; message: string }> {
    try {
      const advice = await this.geminiService.getSkincareAdvice(
        ['test'],
        ['test'],
      );
      return {
        status: 'success',
        message: `Gemini is working. Response: ${advice.substring(0, 100)}...`,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
      };
    }
  }
}
