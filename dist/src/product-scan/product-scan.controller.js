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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductScanController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const product_scan_service_1 = require("./product-scan.service");
const keycloak_auth_guard_1 = require("../auth/guards/keycloak-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let ProductScanController = class ProductScanController {
    constructor(productScanService) {
        this.productScanService = productScanService;
    }
    getErrorMessage(error) {
        return error instanceof Error ? error.message : 'Unknown error';
    }
    async analyzeProductImage(file, imageType = 'file', userId) {
        try {
            if (!file) {
                throw new common_1.BadRequestException('Image file is required');
            }
            if (!file.mimetype?.startsWith('image/')) {
                throw new common_1.BadRequestException('Only image files are allowed');
            }
            const imageData = file?.buffer || null;
            const analysis = await this.productScanService.analyzeProductImage(imageData, userId, imageType, file.mimetype);
            return {
                success: true,
                message: 'Product analyzed successfully',
                data: analysis,
            };
        }
        catch (error) {
            const message = this.getErrorMessage(error);
            return {
                success: false,
                message: `Error analyzing product: ${message}`,
                error: message,
            };
        }
    }
    async scanQRCode(qrData, userId) {
        try {
            if (!qrData) {
                throw new common_1.BadRequestException('QR data is required');
            }
            const product = await this.productScanService.scanQRCode(qrData, userId);
            return {
                success: true,
                message: 'QR code scanned successfully',
                data: product,
            };
        }
        catch (error) {
            const message = this.getErrorMessage(error);
            return {
                success: false,
                message: `Error scanning QR code: ${message}`,
                error: message,
            };
        }
    }
    async searchProduct(code) {
        try {
            if (!code) {
                throw new common_1.BadRequestException('Product code is required');
            }
            const product = await this.productScanService.searchProductByCode(code);
            return {
                success: true,
                message: 'Product found',
                data: product,
            };
        }
        catch (error) {
            const message = this.getErrorMessage(error);
            return {
                success: false,
                message: `Error searching product: ${message}`,
                error: message,
            };
        }
    }
    async getScanHistory(page = 1, limit = 10, userId) {
        try {
            const history = await this.productScanService.getScanHistory(userId, page, limit);
            return {
                success: true,
                message: 'Scan history retrieved',
                data: history,
            };
        }
        catch (error) {
            const message = this.getErrorMessage(error);
            return {
                success: false,
                message: `Error fetching scan history: ${message}`,
                error: message,
            };
        }
    }
    async addProductToList(body, userId) {
        try {
            const result = await this.productScanService.addProductToList(userId, body.product, body.category || 'used');
            return {
                success: true,
                message: 'Product added to list',
                data: result,
            };
        }
        catch (error) {
            const message = this.getErrorMessage(error);
            return {
                success: false,
                message: `Error adding product to list: ${message}`,
                error: message,
            };
        }
    }
    async rateProduct(productId, body, userId) {
        try {
            const result = await this.productScanService.rateProduct(productId, body.rating, body.review, userId);
            return {
                success: true,
                message: 'Product rated successfully',
                data: result,
            };
        }
        catch (error) {
            const message = this.getErrorMessage(error);
            return {
                success: false,
                message: `Error rating product: ${message}`,
                error: message,
            };
        }
    }
    async getDetailedAnalysis(productId) {
        try {
            const analysis = await this.productScanService.getDetailedAnalysis(productId);
            return {
                success: true,
                message: 'Detailed analysis retrieved',
                data: analysis,
            };
        }
        catch (error) {
            const message = this.getErrorMessage(error);
            return {
                success: false,
                message: `Error fetching analysis: ${message}`,
                error: message,
            };
        }
    }
    async getRecommendedProducts(category, userId) {
        try {
            const recommendations = await this.productScanService.getRecommendedProducts(userId, category);
            return {
                success: true,
                message: 'Recommendations retrieved',
                data: recommendations,
            };
        }
        catch (error) {
            const message = this.getErrorMessage(error);
            return {
                success: false,
                message: `Error fetching recommendations: ${message}`,
                error: message,
            };
        }
    }
    async compareProducts(body) {
        try {
            if (!body.productIds || body.productIds.length < 2) {
                throw new common_1.BadRequestException('At least 2 product IDs are required for comparison');
            }
            const comparison = await this.productScanService.compareProducts(body.productIds);
            return {
                success: true,
                message: 'Products compared successfully',
                data: comparison,
            };
        }
        catch (error) {
            const message = this.getErrorMessage(error);
            return {
                success: false,
                message: `Error comparing products: ${message}`,
                error: message,
            };
        }
    }
};
exports.ProductScanController = ProductScanController;
__decorate([
    (0, common_1.Post)('analyze-image'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                image: {
                    type: 'string',
                    format: 'binary',
                    description: 'Product image file',
                },
                imageType: {
                    type: 'string',
                    enum: ['base64', 'file'],
                    description: 'Type of image data provided',
                },
            },
            required: ['image'],
        },
    }),
    (0, swagger_1.ApiOperation)({
        summary: 'Analyze product image using camera or uploaded file',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Product analysis completed successfully',
    }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('imageType')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ProductScanController.prototype, "analyzeProductImage", null);
__decorate([
    (0, common_1.Post)('scan-qr'),
    (0, swagger_1.ApiOperation)({ summary: 'Scan QR code to get product information' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'QR code scanned successfully' }),
    __param(0, (0, common_1.Body)('qrData')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ProductScanController.prototype, "scanQRCode", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, swagger_1.ApiOperation)({ summary: 'Search product by barcode or code' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Product found' }),
    __param(0, (0, common_1.Query)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductScanController.prototype, "searchProduct", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user scan history' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Scan history retrieved' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String]),
    __metadata("design:returntype", Promise)
], ProductScanController.prototype, "getScanHistory", null);
__decorate([
    (0, common_1.Post)('add-to-list'),
    (0, swagger_1.ApiOperation)({ summary: 'Add product to user product list' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Product added to list' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProductScanController.prototype, "addProductToList", null);
__decorate([
    (0, common_1.Post)(':productId/rate'),
    (0, swagger_1.ApiOperation)({ summary: 'Rate a scanned product' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Product rated' }),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], ProductScanController.prototype, "rateProduct", null);
__decorate([
    (0, common_1.Get)(':productId/analysis'),
    (0, swagger_1.ApiOperation)({ summary: 'Get detailed analysis of a product' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Detailed analysis retrieved' }),
    __param(0, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductScanController.prototype, "getDetailedAnalysis", null);
__decorate([
    (0, common_1.Get)('recommendations'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get product recommendations based on skin profile',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Recommendations retrieved' }),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ProductScanController.prototype, "getRecommendedProducts", null);
__decorate([
    (0, common_1.Post)('compare'),
    (0, swagger_1.ApiOperation)({ summary: 'Compare multiple products' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Products compared' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductScanController.prototype, "compareProducts", null);
exports.ProductScanController = ProductScanController = __decorate([
    (0, swagger_1.ApiTags)('Product Scan'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.Controller)('product-scan'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    __metadata("design:paramtypes", [product_scan_service_1.ProductScanService])
], ProductScanController);
//# sourceMappingURL=product-scan.controller.js.map