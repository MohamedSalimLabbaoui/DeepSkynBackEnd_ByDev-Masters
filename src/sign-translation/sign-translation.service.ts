import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import {
  SignTranslationResponse,
  SignTranslationData,
  Frame,
  SignTranslationMetadata,
} from './interfaces/sign-translation.interface';
import {
  TranslateTextDto,
  TranslateVideoPostDto,
} from './dto';

@Injectable()
export class SignTranslationService {
  private readonly logger = new Logger(SignTranslationService.name);
  private readonly MICROSERVICE_URL = process.env.SIGN_TRANSLATION_SERVICE_URL || 'http://localhost:8000';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor(
    private httpService: HttpService,
    private prisma: PrismaService,
  ) {}

  /**
   * Traduit un texte en langage des signes via le microservice
   */
  async translateText(
    dto: TranslateTextDto,
  ): Promise<SignTranslationResponse> {
    return this.callMicroserviceWithRetry(
      dto.text,
      dto.language,
    );
  }

  /**
   * Traduit le transcript d'un post vidéo et le sauvegarde en base
   */
  async translateVideoPost(
    postId: string,
    dto: TranslateVideoPostDto,
  ): Promise<SignTranslationData> {
    try {
      // Appel au microservice avec retry
      const translationResponse = await this.callMicroserviceWithRetry(
        dto.transcript,
        dto.language,
      );

      // Vérifier si la traduction existe déjà
      const existing = await this.prisma.signTranslation.findUnique({
        where: { postId },
      });

      if (existing) {
        // Mettre à jour
        const result = await this.prisma.signTranslation.update({
          where: { postId },
          data: {
            transcript: dto.transcript,
            language: dto.language,
            frames: JSON.stringify(translationResponse.frames),
            metadata: JSON.stringify(translationResponse.metadata),
            status: 'completed',
          },
        });
        return this.parseTranslationResult(result);
      } else {
        // Créer
        const result = await this.prisma.signTranslation.create({
          data: {
            postId,
            transcript: dto.transcript,
            language: dto.language,
            frames: JSON.stringify(translationResponse.frames),
            metadata: JSON.stringify(translationResponse.metadata),
            status: 'completed',
          },
        });
        return this.parseTranslationResult(result);
      }
    } catch (error) {
      this.logger.error(
        `Error translating video post ${postId}: ${error.message}`,
      );

      // Créer ou mettre à jour avec status error
      const existing = await this.prisma.signTranslation.findUnique({
        where: { postId },
      });

      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        'Unknown error occurred';

      if (existing) {
        await this.prisma.signTranslation.update({
          where: { postId },
          data: {
            status: 'error',
            errorMessage,
          },
        });
      } else {
        await this.prisma.signTranslation.create({
          data: {
            postId,
            transcript: dto.transcript,
            language: dto.language,
            frames: [],
            metadata: {},
            status: 'error',
            errorMessage,
          },
        });
      }

      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: `Translation failed: ${errorMessage}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Récupère la traduction d'un post vidéo
   */
  async getVideoPostTranslation(
    postId: string,
  ): Promise<SignTranslationData> {
    const translation = await this.prisma.signTranslation.findUnique({
      where: { postId },
    });

    if (!translation) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          message: `No translation found for post ${postId}`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return this.parseTranslationResult(translation);
  }

  /**
   * Appelle le microservice avec logique de retry
   */
  private async callMicroserviceWithRetry(
    text: string,
    language: string = 'fr',
    retryCount: number = 0,
  ): Promise<SignTranslationResponse> {
    try {
      // Only log on first attempt to reduce verbosity
      if (retryCount === 0) {
        this.logger.log(
          `Calling microservice at ${this.MICROSERVICE_URL}/translate`,
        );
      }

      const response = await lastValueFrom(
        this.httpService.post<SignTranslationResponse>(
          `${this.MICROSERVICE_URL}/translate`,
          { text, language },
          {
            timeout: 30000, // 30 seconds timeout
          },
        ),
      );

      if (!response.data) {
        throw new Error('Empty response from microservice');
      }

      // Convertir la réponse du microservice au format attendu
      const convertedResponse = this.convertMicroserviceResponse(response.data);

      if (!convertedResponse.frames || convertedResponse.frames.length === 0) {
        throw new Error('Invalid response format from microservice: no frames generated');
      }

      return convertedResponse;
    } catch (error) {
      this.logger.warn(
        `Microservice call failed (attempt ${retryCount + 1}/${this.MAX_RETRIES}): ${error.message}`,
      );

      // Retry logic
      if (retryCount < this.MAX_RETRIES - 1) {
        this.logger.debug(
          `Retrying in ${this.RETRY_DELAY}ms... (attempt ${retryCount + 2}/${this.MAX_RETRIES})`,
        );
        await this.delay(this.RETRY_DELAY);
        return this.callMicroserviceWithRetry(text, language, retryCount + 1);
      }

      // Final error after all retries
      if (error.code === 'ECONNREFUSED') {
        this.logger.error(
          `Microservice unavailable at ${this.MICROSERVICE_URL}: Connection refused. ` +
          `Make sure the Python service is running on port 8000.`,
        );
        throw new HttpException(
          {
            status: HttpStatus.SERVICE_UNAVAILABLE,
            message: 'Sign translation service is unavailable',
            error: `Could not connect to ${this.MICROSERVICE_URL}. Make sure the microservice is running.`,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (error.response?.status === 400) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            message: 'Invalid language or missing lexicon',
            error: error.response.data?.error,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.error(
        `All retry attempts failed for text: "${text.substring(0, 50)}..." - ${error.message}`,
      );
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to process sign translation after 3 attempts',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private parseTranslationResult(translation: any): SignTranslationData {
    // Parse JSON fields from Prisma
    return {
      id: translation.id,
      postId: translation.postId,
      transcript: translation.transcript,
      language: translation.language,
      frames: typeof translation.frames === 'string' 
        ? JSON.parse(translation.frames) 
        : translation.frames as Frame[],
      metadata: typeof translation.metadata === 'string'
        ? JSON.parse(translation.metadata)
        : translation.metadata as SignTranslationMetadata,
      status: translation.status,
      errorMessage: translation.errorMessage ?? undefined,
      createdAt: translation.createdAt,
      updatedAt: translation.updatedAt,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Convertit la réponse du microservice Python au format attendu
   * Le microservice Python retourne une liste de keypoints mélangés par frame
   * Cette fonction les sépare en hand_right_keypoints, hand_left_keypoints, pose_keypoints
   */
  private convertMicroserviceResponse(response: any): SignTranslationResponse {
    try {
      // Si la réponse a déjà le bon format, la retourner directement
      if (response.frames && response.frames[0]?.hand_right_keypoints) {
        return response;
      }

      // Sinon, convertir le format Python au format TypeScript
      const convertedFrames = response.frames?.map((frame: any) => {
        const keypoints = frame.keypoints || [];
        const hand_right_keypoints: any[] = [];
        const hand_left_keypoints: any[] = [];
        const pose_keypoints: any[] = [];

        // Catégoriser les keypoints
        keypoints.forEach((kp: any, index: number) => {
          const keypoint = {
            id: kp.name || `keypoint-${index}`,
            x: kp.x || 0,
            y: kp.y || 0,
            z: kp.z || 0,
          };

          // Utiliser le nom ou la position dans la liste pour catégoriser
          const name = kp.name?.toLowerCase() || '';
          if (name.includes('right_hand')) {
            hand_right_keypoints.push(keypoint);
          } else if (name.includes('left_hand')) {
            hand_left_keypoints.push(keypoint);
          } else {
            pose_keypoints.push(keypoint);
          }
        });

        return {
          hand_right_keypoints,
          hand_left_keypoints,
          pose_keypoints,
        };
      }) || [];

      // Adapter les métadonnées au format attendu
      const metadata = {
        gloss: response.metadata?.gloss || 'Unknown',
        fps: response.metadata?.fps || 30,
        total_frames: response.metadata?.total_frames || convertedFrames.length,
      };

      return {
        frames: convertedFrames,
        metadata,
      };
    } catch (error) {
      this.logger.error(
        `Error converting microservice response: ${error.message}`,
      );
      // Retourner une structure par défaut en cas d'erreur
      return {
        frames: [],
        metadata: { gloss: 'Error', fps: 30, total_frames: 0 },
      };
    }
  }
}
}
