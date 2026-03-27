import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SignTranslationService } from './sign-translation.service';
import {
  TranslateTextDto,
  TranslateVideoPostDto,
  SignResponseDto,
  SignTranslationResultDto,
} from './dto';

@ApiTags('sign-translation')
@Controller('sign-translation')
export class SignTranslationController {
  constructor(private readonly signTranslationService: SignTranslationService) {}

  /**
   * POST /sign-translation/translate
   * Traduit un texte en langage des signes
   */
  @Post('translate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Translate text to sign language' })
  @ApiResponse({
    status: 200,
    description: 'Successfully translated text',
    type: SignResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid language or missing lexicon' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  async translateText(
    @Body() dto: TranslateTextDto,
  ): Promise<SignResponseDto> {
    const result =
      await this.signTranslationService.translateText(dto);
    return {
      ...result,
      status: 'success',
    };
  }

  /**
   * POST /sign-translation/videopost/:postId
   * Traduit le transcript d'un post vidéo et le sauvegarde en base
   */
  @Post('videopost/:postId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Translate and save video post transcript' })
  @ApiResponse({
    status: 201,
    description: 'Translation saved successfully',
    type: SignTranslationResultDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid language or translation failed' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  async translateVideoPost(
    @Param('postId') postId: string,
    @Body() dto: TranslateVideoPostDto,
  ): Promise<SignTranslationResultDto> {
    return this.signTranslationService.translateVideoPost(
      postId,
      dto,
    );
  }

  /**
   * GET /sign-translation/videopost/:postId
   * Récupère la traduction d'un post vidéo
   */
  @Get('videopost/:postId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get video post translation' })
  @ApiResponse({
    status: 200,
    description: 'Translation retrieved successfully',
    type: SignTranslationResultDto,
  })
  @ApiResponse({ status: 404, description: 'Translation not found' })
  async getVideoPostTranslation(
    @Param('postId') postId: string,
  ): Promise<SignTranslationResultDto> {
    return this.signTranslationService.getVideoPostTranslation(
      postId,
    );
  }
}
