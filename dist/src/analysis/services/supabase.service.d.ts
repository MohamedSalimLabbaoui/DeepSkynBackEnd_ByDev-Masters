import { ConfigService } from '@nestjs/config';
export interface UploadResult {
    url: string;
    path: string;
    bucket: string;
}
export interface SupabaseConfig {
    url: string;
    anonKey: string;
    bucket: string;
}
export declare class SupabaseService {
    private readonly configService;
    private readonly logger;
    private readonly supabase;
    private readonly bucket;
    private readonly supabaseUrl;
    constructor(configService: ConfigService);
    uploadImage(file: Express.Multer.File, userId: string, folder?: string): Promise<UploadResult>;
    upload3DModel(file: Express.Multer.File, userId: string): Promise<UploadResult>;
    uploadMultipleImages(files: Express.Multer.File[], userId: string, folder?: string): Promise<UploadResult[]>;
    uploadBase64Image(base64Data: string, userId: string, mimeType?: string, folder?: string): Promise<UploadResult>;
    deleteImage(path: string): Promise<void>;
    deleteMultipleImages(paths: string[]): Promise<void>;
    getSignedUrl(path: string, expiresIn?: number): Promise<string>;
    listFiles(folder: string): Promise<any[]>;
    getPublicUrl(path: string): string;
    extractPathFromUrl(url: string): string | null;
    private validateFile;
    private getFileExtension;
    checkBucketAccess(): Promise<boolean>;
}
