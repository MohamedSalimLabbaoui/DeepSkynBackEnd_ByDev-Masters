"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SupabaseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseService = void 0;
const common_1 = require("@nestjs/common");
const supabase_js_1 = require("@supabase/supabase-js");
const sharp_1 = require("sharp");
let SupabaseService = SupabaseService_1 = class SupabaseService {
    constructor() {
        this.logger = new common_1.Logger(SupabaseService_1.name);
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase configuration');
        }
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
        this.logger.log('Supabase client initialized');
    }
    async uploadImage(imageBuffer, fileName, contentType = 'image/jpeg') {
        try {
            const bucket = process.env.SUPABASE_BUCKET || 'deepskyn-images';
            const { error } = await this.supabase.storage
                .from(bucket)
                .upload(fileName, imageBuffer, {
                contentType,
                upsert: false,
            });
            if (error) {
                this.logger.error(`Upload error: ${error.message}`, error);
                throw error;
            }
            const { data: publicUrlData } = this.supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);
            this.logger.log(`Image uploaded successfully: ${fileName}`);
            return (publicUrlData?.publicUrl ||
                `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`);
        }
        catch (error) {
            this.logger.error('Error uploading image to Supabase', error);
            throw error;
        }
    }
    async downloadImage(fileName) {
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
        }
        catch (error) {
            this.logger.error('Error downloading image from Supabase', error);
            throw error;
        }
    }
    async deleteImage(fileName) {
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
        }
        catch (error) {
            this.logger.error('Error deleting image from Supabase', error);
            throw error;
        }
    }
    async listImages(prefix) {
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
        }
        catch (error) {
            this.logger.error('Error listing images from Supabase', error);
            throw error;
        }
    }
    async processAndUploadImage(imageBuffer, userId, options = {}) {
        try {
            const { quality = 85, maxWidth = 1024, maxHeight = 1024 } = options;
            const metadata = await (0, sharp_1.default)(imageBuffer).metadata();
            const compressedBuffer = await (0, sharp_1.default)(imageBuffer)
                .resize(maxWidth, maxHeight, {
                fit: 'inside',
                withoutEnlargement: true,
            })
                .jpeg({ quality, progressive: true })
                .toBuffer();
            const fileName = `product-scans/${userId}/product-${Date.now()}.jpg`;
            const publicUrl = await this.uploadImage(compressedBuffer, fileName, 'image/jpeg');
            return {
                fileName,
                publicUrl,
                size: compressedBuffer.length,
                width: metadata.width,
                height: metadata.height,
            };
        }
        catch (error) {
            this.logger.error('Error processing and uploading image', error);
            throw error;
        }
    }
    async getSignedUrl(fileName, expiresIn = 3600) {
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
        }
        catch (error) {
            this.logger.error('Error creating signed URL', error);
            throw error;
        }
    }
    async deleteImages(fileNames) {
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
        }
        catch (error) {
            this.logger.error('Error batch deleting images from Supabase', error);
            throw error;
        }
    }
};
exports.SupabaseService = SupabaseService;
exports.SupabaseService = SupabaseService = SupabaseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], SupabaseService);
//# sourceMappingURL=supabase.service.js.map