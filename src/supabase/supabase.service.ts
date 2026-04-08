import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.logger.log('Supabase client initialized');
  }

  /**
   * Upload an image to Supabase storage
   */
  async uploadImage(
    imageBuffer: Buffer,
    fileName: string,
    contentType: string = 'image/jpeg'
  ): Promise<string> {
    try {
      const bucket = process.env.SUPABASE_BUCKET || 'deepskyn-images';

      // Upload to Supabase
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(fileName, imageBuffer, {
          contentType,
          upsert: false,
        });

      if (error) {
        this.logger.error(`Upload error: ${error.message}`, error);
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = this.supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      this.logger.log(`Image uploaded successfully: ${fileName}`);
      return publicUrlData?.publicUrl || `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
    } catch (error) {
      this.logger.error('Error uploading image to Supabase', error);
      throw error;
    }
  }

  /**
   * Download an image from Supabase storage
   */
  async downloadImage(fileName: string): Promise<Buffer> {
    try {
      const bucket = process.env.SUPABASE_BUCKET || 'deepskyn-images';

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .download(fileName);

      if (error) {
        this.logger.error(`Download error: ${error.message}`, error);
        throw error;
      }

      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      this.logger.error('Error downloading image from Supabase', error);
      throw error;
    }
  }

  /**
   * Delete an image from Supabase storage
   */
  async deleteImage(fileName: string): Promise<void> {
    try {
      const bucket = process.env.SUPABASE_BUCKET || 'deepskyn-images';

      const { error } = await this.supabase.storage
        .from(bucket)
        .remove([fileName]);

      if (error) {
        this.logger.error(`Delete error: ${error.message}`, error);
        throw error;
      }

      this.logger.log(`Image deleted successfully: ${fileName}`);
    } catch (error) {
      this.logger.error('Error deleting image from Supabase', error);
      throw error;
    }
  }

  /**
   * List images in bucket
   */
  async listImages(prefix?: string): Promise<any[]> {
    try {
      const bucket = process.env.SUPABASE_BUCKET || 'deepskyn-images';

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .list(prefix || 'product-scans', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) {
        this.logger.error(`List error: ${error.message}`, error);
        throw error;
      }

      return data || [];
    } catch (error) {
      this.logger.error('Error listing images from Supabase', error);
      throw error;
    }
  }

  /**
   * Process and upload image with compression
   */
  async processAndUploadImage(
    imageBuffer: Buffer,
    userId: string,
    options: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
    } = {}
  ): Promise<{
    fileName: string;
    publicUrl: string;
    size: number;
    width?: number;
    height?: number;
  }> {
    try {
      const {
        quality = 85,
        maxWidth = 1024,
        maxHeight = 1024,
      } = options;

      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();

      // Compress and resize
      const compressedBuffer = await sharp(imageBuffer)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality, progressive: true })
        .toBuffer();

      // Generate file name
      const fileName = `product-scans/${userId}/product-${Date.now()}.jpg`;

      // Upload to Supabase
      const publicUrl = await this.uploadImage(compressedBuffer, fileName, 'image/jpeg');

      return {
        fileName,
        publicUrl,
        size: compressedBuffer.length,
        width: metadata.width,
        height: metadata.height,
      };
    } catch (error) {
      this.logger.error('Error processing and uploading image', error);
      throw error;
    }
  }

  /**
   * Get signed URL for temporary access
   */
  async getSignedUrl(fileName: string, expiresIn: number = 3600): Promise<string> {
    try {
      const bucket = process.env.SUPABASE_BUCKET || 'deepskyn-images';

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(fileName, expiresIn);

      if (error) {
        this.logger.error(`Signed URL error: ${error.message}`, error);
        throw error;
      }

      return data?.signedUrl || '';
    } catch (error) {
      this.logger.error('Error creating signed URL', error);
      throw error;
    }
  }

  /**
   * Batch delete images
   */
  async deleteImages(fileNames: string[]): Promise<void> {
    try {
      const bucket = process.env.SUPABASE_BUCKET || 'deepskyn-images';

      const { error } = await this.supabase.storage
        .from(bucket)
        .remove(fileNames);

      if (error) {
        this.logger.error(`Batch delete error: ${error.message}`, error);
        throw error;
      }

      this.logger.log(`Deleted ${fileNames.length} images successfully`);
    } catch (error) {
      this.logger.error('Error batch deleting images from Supabase', error);
      throw error;
    }
  }
}
