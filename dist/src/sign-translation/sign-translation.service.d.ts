import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { SignTranslationResponse, SignTranslationData } from './interfaces/sign-translation.interface';
import { TranslateTextDto, TranslateVideoPostDto } from './dto';
export declare class SignTranslationService {
    private httpService;
    private prisma;
    private readonly logger;
    private readonly MICROSERVICE_URL;
    private readonly MAX_RETRIES;
    private readonly RETRY_DELAY;
    constructor(httpService: HttpService, prisma: PrismaService);
    translateText(dto: TranslateTextDto): Promise<SignTranslationResponse>;
    translateVideoPost(postId: string, dto: TranslateVideoPostDto): Promise<SignTranslationData>;
    getVideoPostTranslation(postId: string): Promise<SignTranslationData>;
    private callMicroserviceWithRetry;
    private parseTranslationResult;
    private delay;
    private convertMicroserviceResponse;
}
