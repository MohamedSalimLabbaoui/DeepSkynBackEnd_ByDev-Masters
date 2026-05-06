import { SignTranslationService } from './sign-translation.service';
import { TranslateTextDto, TranslateVideoPostDto, SignResponseDto, SignTranslationResultDto } from './dto';
export declare class SignTranslationController {
    private readonly signTranslationService;
    constructor(signTranslationService: SignTranslationService);
    translateText(dto: TranslateTextDto): Promise<SignResponseDto>;
    translateVideoPost(postId: string, dto: TranslateVideoPostDto): Promise<SignTranslationResultDto>;
    getVideoPostTranslation(postId: string): Promise<SignTranslationResultDto>;
}
