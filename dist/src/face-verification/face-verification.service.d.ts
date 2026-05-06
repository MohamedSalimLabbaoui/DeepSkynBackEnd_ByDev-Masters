import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../analysis/services/supabase.service';
export interface FaceVerificationResult {
    verified: boolean;
    confidence: number;
    message: string;
    needsProfilePhoto: boolean;
}
export interface FaceDescriptor {
    descriptor: number[];
}
export declare class FaceVerificationService {
    private prisma;
    private supabaseService;
    private readonly SIMILARITY_THRESHOLD;
    private readonly logger;
    private static faceModelsLoadPromise;
    constructor(prisma: PrismaService, supabaseService: SupabaseService);
    private ensureFaceModelsLoaded;
    private normalizeBase64;
    private decodeImageToTensor;
    private extractDescriptorFromImageBase64;
    verifyFace(userId: string, faceDescriptor?: number[], imageBase64?: string): Promise<FaceVerificationResult>;
    registerFaceFromProfilePhoto(userId: string, descriptor: number[]): Promise<void>;
    registerFaceReference(userId: string, descriptor?: number[], imageBase64?: string): Promise<void>;
    private calculateSimilarity;
    hasFaceReference(userId: string): Promise<boolean>;
    deleteFaceReference(userId: string): Promise<void>;
    getFaceReference(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        imageUrl: string;
    }>;
    getProfilePhotoUrl(userId: string): Promise<string | null>;
}
