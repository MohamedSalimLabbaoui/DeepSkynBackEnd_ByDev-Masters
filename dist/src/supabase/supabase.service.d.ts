export declare class SupabaseService {
    private readonly logger;
    private supabase;
    constructor();
    uploadImage(imageBuffer: Buffer, fileName: string, contentType?: string): Promise<string>;
    downloadImage(fileName: string): Promise<Buffer>;
    deleteImage(fileName: string): Promise<void>;
    listImages(prefix?: string): Promise<any[]>;
    processAndUploadImage(imageBuffer: Buffer, userId: string, options?: {
        quality?: number;
        maxWidth?: number;
        maxHeight?: number;
    }): Promise<{
        fileName: string;
        publicUrl: string;
        size: number;
        width?: number;
        height?: number;
    }>;
    getSignedUrl(fileName: string, expiresIn?: number): Promise<string>;
    deleteImages(fileNames: string[]): Promise<void>;
}
