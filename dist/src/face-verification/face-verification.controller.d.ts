import { FaceVerificationService, FaceVerificationResult } from './face-verification.service';
import { VerifyFaceDto } from './dto/verify-face.dto';
export declare class FaceVerificationController {
    private readonly faceVerificationService;
    constructor(faceVerificationService: FaceVerificationService);
    verifyFace(userId: string, verifyFaceDto: VerifyFaceDto): Promise<FaceVerificationResult>;
    getFaceStatus(userId: string): Promise<{
        hasFaceReference: boolean;
        hasProfilePhoto: boolean;
        profilePhotoUrl: string;
        faceReference: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string;
        };
    }>;
    registerFromProfile(userId: string, verifyFaceDto: VerifyFaceDto): Promise<{
        success: boolean;
        message: string;
    }>;
    registerFace(userId: string, verifyFaceDto: VerifyFaceDto): Promise<{
        success: boolean;
        message: string;
    }>;
    resetFaceReference(userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
