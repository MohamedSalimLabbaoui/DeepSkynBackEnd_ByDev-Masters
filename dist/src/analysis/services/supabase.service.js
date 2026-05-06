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
const config_1 = require("@nestjs/config");
const supabase_js_1 = require("@supabase/supabase-js");
const crypto_1 = require("crypto");
let SupabaseService = SupabaseService_1 = class SupabaseService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(SupabaseService_1.name);
        this.supabaseUrl = this.configService.get('SUPABASE_URL');
        const supabaseKey = this.configService.get('SUPABASE_SERVICE_KEY') ||
            this.configService.get('SUPABASE_ANON_KEY');
        this.bucket =
            this.configService.get('SUPABASE_BUCKET') || 'skin-images';
        this.supabase = (0, supabase_js_1.createClient)(this.supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });
        this.logger.log(`Supabase initialized - URL: ${this.supabaseUrl}, Bucket: ${this.bucket}`);
    }
    async uploadImage(file, userId, folder = 'analyses') {
        try {
            this.validateFile(file);
            const extension = this.getFileExtension(file.originalname, file.mimetype);
            const fileName = `${folder}/${userId}/${(0, crypto_1.randomUUID)()}.${extension}`;
            this.logger.log(`Attempting upload: ${fileName}`);
            this.logger.log(`File size: ${file.size}, MimeType: ${file.mimetype}`);
            const { error } = await this.supabase.storage
                .from(this.bucket)
                .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true,
            });
            if (error) {
                this.logger.error(`Supabase upload error: ${error.message}`);
                throw new common_1.BadRequestException(`Upload failed: ${error.message}`);
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
        }
        catch (error) {
            this.logger.error('Failed to upload image to Supabase', error.message);
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to upload image');
        }
    }
    async upload3DModel(file, userId) {
        try {
            const maxSize = 50 * 1024 * 1024;
            if (!file.originalname.toLowerCase().endsWith('.glb')) {
                throw new common_1.BadRequestException('Only .glb files are allowed');
            }
            if (file.size > maxSize) {
                throw new common_1.BadRequestException('File size exceeds 50MB limit');
            }
            const fileName = `avatars3d/${userId}/${(0, crypto_1.randomUUID)()}.glb`;
            this.logger.log(`Attempting 3D avatar upload: ${fileName}`);
            const { error } = await this.supabase.storage
                .from(this.bucket)
                .upload(fileName, file.buffer, {
                contentType: file.mimetype || 'model/gltf-binary',
                upsert: true,
            });
            if (error) {
                throw new common_1.BadRequestException(`Upload failed: ${error.message}`);
            }
            const { data: urlData } = this.supabase.storage
                .from(this.bucket)
                .getPublicUrl(fileName);
            return {
                url: urlData.publicUrl,
                path: fileName,
                bucket: this.bucket,
            };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.BadRequestException('Failed to upload 3D model');
        }
    }
    async uploadMultipleImages(files, userId, folder = 'analyses') {
        if (!files || files.length === 0) {
            throw new common_1.BadRequestException('No files provided');
        }
        if (files.length > 5) {
            throw new common_1.BadRequestException('Maximum 5 images allowed');
        }
        const uploadPromises = files.map((file) => this.uploadImage(file, userId, folder));
        return Promise.all(uploadPromises);
    }
    async uploadBase64Image(base64Data, userId, mimeType = 'image/jpeg', folder = 'scans') {
        try {
            const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Clean, 'base64');
            const extension = mimeType.split('/')[1] || 'jpeg';
            const fileName = `${folder}/${userId}/${(0, crypto_1.randomUUID)()}.${extension}`;
            const { error } = await this.supabase.storage
                .from(this.bucket)
                .upload(fileName, buffer, {
                contentType: mimeType,
                upsert: true,
            });
            if (error) {
                this.logger.error(`Base64 upload error: ${error.message}`);
                throw new common_1.BadRequestException(`Upload failed: ${error.message}`);
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
        }
        catch (error) {
            this.logger.error('Failed to upload base64 image', error.message);
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to upload image');
        }
    }
    async deleteImage(path) {
        try {
            const { error } = await this.supabase.storage
                .from(this.bucket)
                .remove([path]);
            if (error) {
                this.logger.error(`Delete error: ${error.message}`);
            }
            else {
                this.logger.log(`Image deleted: ${path}`);
            }
        }
        catch (error) {
            this.logger.error(`Failed to delete image: ${path}`, error.message);
        }
    }
    async deleteMultipleImages(paths) {
        try {
            const { error } = await this.supabase.storage
                .from(this.bucket)
                .remove(paths);
            if (error) {
                this.logger.error(`Bulk delete error: ${error.message}`);
            }
        }
        catch (error) {
            this.logger.error('Failed to delete images', error.message);
        }
    }
    async getSignedUrl(path, expiresIn = 3600) {
        try {
            const { data, error } = await this.supabase.storage
                .from(this.bucket)
                .createSignedUrl(path, expiresIn);
            if (error) {
                throw new common_1.BadRequestException(`Failed to create signed URL: ${error.message}`);
            }
            return data.signedUrl;
        }
        catch (error) {
            this.logger.error('Failed to get signed URL', error.message);
            throw new common_1.BadRequestException('Failed to get signed URL');
        }
    }
    async listFiles(folder) {
        try {
            const { data, error } = await this.supabase.storage
                .from(this.bucket)
                .list(folder);
            if (error) {
                this.logger.error(`List files error: ${error.message}`);
                return [];
            }
            return data || [];
        }
        catch (error) {
            this.logger.error('Failed to list files', error.message);
            return [];
        }
    }
    getPublicUrl(path) {
        const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(path);
        return data.publicUrl;
    }
    extractPathFromUrl(url) {
        const pattern = new RegExp(`${this.bucket}/(.+)$`);
        const match = url.match(pattern);
        return match ? match[1] : null;
    }
    validateFile(file) {
        const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/heic',
        ];
        const maxSize = 10 * 1024 * 1024;
        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new common_1.BadRequestException(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`);
        }
        if (file.size > maxSize) {
            throw new common_1.BadRequestException('File size exceeds 10MB limit');
        }
    }
    getFileExtension(filename, mimetype) {
        const filenameExt = filename?.split('.').pop()?.toLowerCase();
        if (filenameExt &&
            ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(filenameExt)) {
            return filenameExt === 'jpg' ? 'jpeg' : filenameExt;
        }
        const mimeToExt = {
            'image/jpeg': 'jpeg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/heic': 'heic',
        };
        return mimeToExt[mimetype] || 'jpeg';
    }
    async checkBucketAccess() {
        try {
            const { data, error } = await this.supabase.storage.listBuckets();
            if (error) {
                this.logger.error(`Bucket access check failed: ${error.message}`);
                return false;
            }
            const bucketExists = data?.some((b) => b.name === this.bucket);
            this.logger.log(`Bucket ${this.bucket} exists: ${bucketExists}`);
            return bucketExists;
        }
        catch (error) {
            this.logger.error('Failed to check bucket access', error.message);
            return false;
        }
    }
};
exports.SupabaseService = SupabaseService;
exports.SupabaseService = SupabaseService = SupabaseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SupabaseService);
//# sourceMappingURL=supabase.service.js.map