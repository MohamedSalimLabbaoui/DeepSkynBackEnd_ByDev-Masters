import { Frame, SignTranslationMetadata } from '../interfaces/sign-translation.interface';
export declare class SignResponseDto {
    frames: Frame[];
    metadata: SignTranslationMetadata;
    status: string;
    message?: string;
    error?: string;
}
export declare class SignTranslationResultDto {
    id: string;
    postId: string;
    transcript: string;
    language: string;
    frames: Frame[];
    metadata: SignTranslationMetadata;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}
