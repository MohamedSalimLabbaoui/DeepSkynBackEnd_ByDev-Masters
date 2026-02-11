import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

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

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly supabase: SupabaseClient;
  private readonly bucket: string;
  private readonly supabaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY') 
      || this.configService.get<string>('SUPABASE_ANON_KEY');
    this.bucket = this.configService.get<string>('SUPABASE_BUCKET') || 'skin-images';
    
    // Create Supabase client
    this.supabase = createClient(this.supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    
    this.logger.log(`Supabase initialized - URL: ${this.supabaseUrl}, Bucket: ${this.bucket}`);
  }

  /**
   * Upload a single image to Supabase Storage
   */
  async uploadImage(
    file: Express.Multer.File,
    userId: string,
    folder: string = 'analyses',
  ): Promise<UploadResult> {
    try {
      this.validateFile(file);

      const extension = this.getFileExtension(file.originalname, file.mimetype);
      const fileName = `${folder}/${userId}/${randomUUID()}.${extension}`;

      this.logger.log(`Attempting upload: ${fileName}`);
      this.logger.log(`File size: ${file.size}, MimeType: ${file.mimetype}`);

      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (error) {
        this.logger.error(`Supabase upload error: ${error.message}`);
        throw new BadRequestException(`Upload failed: ${error.message}`);
      }

      const { data: urlData } = this.supabase.storage
        .from(this.bucket)
        .getPublicUrl(fileName);

      this.logger.log(`Image uploaded successfully: ${fileName}`);

      return {
        url: urlData.publicUrl,
        path: fileName,
        bucket: this.bucket,
      };
    } catch (error) {
      this.logger.error('Failed to upload image to Supabase', error.message);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to upload image');
    }
  }

  /**
   * Upload multiple images to Supabase Storage
   */
  async uploadMultipleImages(
    files: Express.Multer.File[],
    userId: string,
    folder: string = 'analyses',
  ): Promise<UploadResult[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    if (files.length > 5) {
      throw new BadRequestException('Maximum 5 images allowed');
    }

    const uploadPromises = files.map((file) => this.uploadImage(file, userId, folder));
    return Promise.all(uploadPromises);
  }

  /**
   * Upload base64 image (for real-time scans)
   */
  async uploadBase64Image(
    base64Data: string,
    userId: string,
    mimeType: string = 'image/jpeg',
    folder: string = 'scans',
  ): Promise<UploadResult> {
    try {
      // Remove data URL prefix if present
      const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Clean, 'base64');

      const extension = mimeType.split('/')[1] || 'jpeg';
      const fileName = `${folder}/${userId}/${randomUUID()}.${extension}`;

      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .upload(fileName, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (error) {
        this.logger.error(`Base64 upload error: ${error.message}`);
        throw new BadRequestException(`Upload failed: ${error.message}`);
      }

      const { data: urlData } = this.supabase.storage
        .from(this.bucket)
        .getPublicUrl(fileName);

      this.logger.log(`Base64 image uploaded: ${fileName}`);

      return {
        url: urlData.publicUrl,
        path: fileName,
        bucket: this.bucket,
      };
    } catch (error) {
      this.logger.error('Failed to upload base64 image', error.message);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to upload image');
    }
  }

  /**
   * Delete an image from Supabase Storage
   */
  async deleteImage(path: string): Promise<void> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .remove([path]);

      if (error) {
        this.logger.error(`Delete error: ${error.message}`);
      } else {
        this.logger.log(`Image deleted: ${path}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete image: ${path}`, error.message);
      // Don't throw - deletion failure shouldn't break the flow
    }
  }

  /**
   * Delete multiple images
   */
  async deleteMultipleImages(paths: string[]): Promise<void> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .remove(paths);

      if (error) {
        this.logger.error(`Bulk delete error: ${error.message}`);
      }
    } catch (error) {
      this.logger.error('Failed to delete images', error.message);
    }
  }

  /**
   * Get signed URL for private access
   */
  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        throw new BadRequestException(`Failed to create signed URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      this.logger.error('Failed to get signed URL', error.message);
      throw new BadRequestException('Failed to get signed URL');
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(folder: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .list(folder);

      if (error) {
        this.logger.error(`List files error: ${error.message}`);
        return [];
      }

      return data || [];
    } catch (error) {
      this.logger.error('Failed to list files', error.message);
      return [];
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(path: string): string {
    const { data } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Extract path from full URL
   */
  extractPathFromUrl(url: string): string | null {
    const pattern = new RegExp(`${this.bucket}/(.+)$`);
    const match = url.match(pattern);
    return match ? match[1] : null;
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: Express.Multer.File): void {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
      );
    }

    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }
  }

  /**
   * Get file extension from filename or mimetype
   */
  private getFileExtension(filename: string, mimetype: string): string {
    // Try to get from filename first
    const filenameExt = filename?.split('.').pop()?.toLowerCase();
    if (filenameExt && ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(filenameExt)) {
      return filenameExt === 'jpg' ? 'jpeg' : filenameExt;
    }

    // Fallback to mimetype
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpeg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/heic': 'heic',
    };

    return mimeToExt[mimetype] || 'jpeg';
  }

  /**
   * Check if bucket exists and is accessible
   */
  async checkBucketAccess(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.storage.listBuckets();
      
      if (error) {
        this.logger.error(`Bucket access check failed: ${error.message}`);
        return false;
      }

      const bucketExists = data?.some(b => b.name === this.bucket);
      this.logger.log(`Bucket ${this.bucket} exists: ${bucketExists}`);
      return bucketExists;
    } catch (error) {
      this.logger.error('Failed to check bucket access', error.message);
      return false;
    }
  }
}
