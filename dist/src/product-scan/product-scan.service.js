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
var ProductScanService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductScanService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const supabase_service_1 = require("../analysis/services/supabase.service");
const gemini_service_1 = require("../analysis/services/gemini.service");
const axios_1 = require("axios");
const sharp = require("sharp");
let ProductScanService = ProductScanService_1 = class ProductScanService {
    constructor(prisma, supabaseService, geminiService) {
        this.prisma = prisma;
        this.supabaseService = supabaseService;
        this.geminiService = geminiService;
        this.logger = new common_1.Logger(ProductScanService_1.name);
    }
    async analyzeProductImage(imageData, userId, imageType = 'base64', mimeType = 'image/jpeg') {
        try {
            this.logger.log(`Analyzing product image for user ${userId}`);
            if (!imageData) {
                throw new Error('Image data is required');
            }
            let base64String;
            if (imageType === 'base64') {
                base64String = String(imageData).replace(/^data:image\/\w+;base64,/, '');
            }
            else {
                base64String = imageData.toString('base64');
            }
            const uploadResult = await this.supabaseService.uploadBase64Image(base64String, userId, mimeType, 'product-scans');
            this.logger.log(`Image uploaded to Supabase: ${uploadResult.path}`);
            const buffer = Buffer.from(base64String, 'base64');
            const resizedBuffer = await sharp(buffer)
                .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
                .toBuffer();
            const resizedBase64 = resizedBuffer.toString('base64');
            const userSkinProfile = await this.prisma.skinProfile.findUnique({
                where: { userId },
                select: {
                    skinType: true,
                    concerns: true,
                    sensitivities: true,
                },
            });
            const analysis = await this.geminiService.analyzeCosmeticProductImage(resizedBase64, {
                skinType: userSkinProfile?.skinType || undefined,
                concerns: userSkinProfile?.concerns || [],
                sensitivities: userSkinProfile?.sensitivities || [],
            }, mimeType);
            const savedProduct = await this.prisma.productScan.create({
                data: {
                    userId,
                    productName: analysis.name,
                    brand: analysis.brand,
                    category: analysis.category,
                    ingredients: JSON.stringify(analysis.ingredients),
                    benefits: JSON.stringify(analysis.benefits),
                    concerns: JSON.stringify(analysis.concerns),
                    skinTypeCompatibility: JSON.stringify(analysis.skinTypeCompatibility),
                    recommendation: analysis.recommendation,
                    imageUrl: uploadResult.url,
                    analysisResult: JSON.stringify(analysis),
                },
            });
            return {
                id: savedProduct.id,
                name: analysis.name,
                brand: analysis.brand,
                image: uploadResult.url,
                category: analysis.category,
                ingredients: analysis.ingredients,
                benefits: analysis.benefits,
                concerns: analysis.concerns,
                skinTypeCompatibility: analysis.skinTypeCompatibility,
                recommendation: analysis.recommendation,
            };
        }
        catch (error) {
            this.logger.error('Error analyzing product image:', error);
            throw error;
        }
    }
    async scanQRCode(qrData, userId) {
        try {
            this.logger.log(`Scanning QR code: ${qrData}`);
            const extractedCode = this.extractProductCodeFromQrData(qrData);
            let product;
            try {
                const codeToUse = extractedCode || qrData;
                product = await this.searchProductByCode(codeToUse);
            }
            catch {
                this.logger.warn(`QR product lookup failed for payload "${qrData}"${extractedCode ? ` (extracted code: ${extractedCode})` : ''}. Returning fallback product.`);
                product = {
                    id: `qr-${Date.now()}`,
                    name: 'Produit scanne via QR',
                    brand: 'Inconnue',
                    image: '',
                    category: 'Cosmetique',
                    ingredients: [],
                    benefits: [],
                    concerns: [
                        {
                            title: 'Produit introuvable',
                            description: 'Le QR a ete lu, mais aucune fiche produit correspondante n a ete trouvee dans la base externe.',
                            severity: 'low',
                        },
                    ],
                    skinTypeCompatibility: [],
                    recommendation: 'Le code QR a ete scanne avec succes. Vous pouvez analyser une photo du produit pour obtenir une analyse complete.',
                };
            }
            await this.prisma.productScan.create({
                data: {
                    userId,
                    productName: product.name,
                    brand: product.brand,
                    category: product.category,
                    ingredients: JSON.stringify(product.ingredients),
                    qrCode: qrData,
                    analysisResult: JSON.stringify(product),
                },
            });
            return product;
        }
        catch (error) {
            this.logger.error('Error scanning QR code:', error);
            throw error;
        }
    }
    extractProductCodeFromQrData(qrData) {
        if (!qrData) {
            return null;
        }
        const raw = qrData.trim();
        if (/^\d{8,14}$/.test(raw)) {
            return raw;
        }
        try {
            const url = new URL(raw);
            const candidates = ['ean', 'upc', 'gtin', 'barcode', 'code', 'product'];
            for (const key of candidates) {
                const value = url.searchParams.get(key);
                if (value && /^\d{8,14}$/.test(value)) {
                    return value;
                }
            }
        }
        catch {
        }
        const match = raw.match(/\b\d{8,14}\b/);
        return match ? match[0] : null;
    }
    async searchProductByCode(code) {
        const strategies = [
            () => this.searchOpenBeautyFacts(code),
            () => this.searchOpenFoodFacts(code),
            () => this.searchUPCItemDB(code),
            () => this.searchGoUPC(code),
        ];
        for (const strategy of strategies) {
            try {
                const product = await strategy();
                if (product)
                    return product;
            }
            catch (err) {
                this.logger.warn(`Strategy failed: ${err.message}`);
            }
        }
        throw new Error(`Product not found for code: ${code}`);
    }
    async searchOpenBeautyFacts(code) {
        const res = await axios_1.default.get(`https://world.openbeautyfacts.org/api/v2/product/${code}.json`, { timeout: 5000 });
        if (res.data.status === 1 && res.data.product) {
            return this.formatProductFromAPI(res.data.product, 'openbeautyfacts');
        }
        return null;
    }
    async searchOpenFoodFacts(code) {
        const res = await axios_1.default.get(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
        if (res.data.status === 1 && res.data.product) {
            return this.formatProductFromAPI(res.data.product, 'openfoodfacts');
        }
        return null;
    }
    async searchUPCItemDB(code) {
        const res = await axios_1.default.get(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`);
        if (res.data.items?.length > 0) {
            return this.formatProductFromAPI(res.data.items[0], 'upcitemdb');
        }
        return null;
    }
    async searchGoUPC(code) {
        if (!process.env.GO_UPC_API_KEY)
            return null;
        const res = await axios_1.default.get(`https://go-upc.com/api/v1/code/${code}`, {
            headers: { Authorization: `Bearer ${process.env.GO_UPC_API_KEY}` },
        });
        if (res.data.product) {
            return this.formatProductFromAPI(res.data.product, 'goupc');
        }
        return null;
    }
    async getScanHistory(userId, page = 1, limit = 10) {
        try {
            const skip = (page - 1) * limit;
            const [scans, total] = await Promise.all([
                this.prisma.productScan.findMany({
                    where: { userId },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.productScan.count({ where: { userId } }),
            ]);
            return {
                data: scans.map((scan) => ({
                    id: scan.id,
                    productName: scan.productName,
                    brand: scan.brand,
                    category: scan.category,
                    imageUrl: scan.imageUrl,
                    createdAt: scan.createdAt,
                    rating: scan.rating,
                })),
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            this.logger.error('Error fetching scan history:', error);
            throw error;
        }
    }
    async addProductToList(userId, product, category = 'used') {
        try {
            const userProduct = await this.prisma.userProduct.create({
                data: {
                    userId,
                    productName: product.name,
                    brand: product.brand,
                    category,
                    categoryType: category,
                    ingredients: JSON.stringify(product.ingredients),
                    imageUrl: product.image,
                    productData: JSON.stringify(product),
                },
            });
            return userProduct;
        }
        catch (error) {
            this.logger.error('Error adding product to list:', error);
            throw error;
        }
    }
    async rateProduct(productId, rating, review, userId) {
        try {
            const updateData = { rating };
            if (review)
                updateData.review = review;
            const updatedScan = await this.prisma.productScan.update({
                where: { id: productId },
                data: updateData,
            });
            return updatedScan;
        }
        catch (error) {
            this.logger.error('Error rating product:', error);
            throw error;
        }
    }
    async getDetailedAnalysis(productId) {
        try {
            const scan = await this.prisma.productScan.findUnique({
                where: { id: productId },
            });
            if (!scan)
                throw new Error('Product scan not found');
            return JSON.parse(scan.analysisResult || '{}');
        }
        catch (error) {
            this.logger.error('Error fetching detailed analysis:', error);
            throw error;
        }
    }
    async getRecommendedProducts(userId, category) {
        try {
            const userSkinProfile = await this.prisma.skinProfile.findUnique({
                where: { userId },
            });
            const where = {};
            if (category)
                where.category = category;
            const products = await this.prisma.productScan.findMany({
                where: {
                    ...where,
                },
                take: 10,
            });
            return products.map((p) => ({
                id: p.id,
                name: p.productName,
                brand: p.brand,
                category: p.category,
                imageUrl: p.imageUrl,
            }));
        }
        catch (error) {
            this.logger.error('Error fetching recommended products:', error);
            throw error;
        }
    }
    async compareProducts(productIds) {
        try {
            const products = await this.prisma.productScan.findMany({
                where: { id: { in: productIds } },
            });
            return products.map((p) => ({
                id: p.id,
                name: p.productName,
                brand: p.brand,
                category: p.category,
                ingredients: JSON.parse(p.ingredients || '[]'),
                analysis: JSON.parse(p.analysisResult || '{}'),
            }));
        }
        catch (error) {
            this.logger.error('Error comparing products:', error);
            throw error;
        }
    }
    formatProductFromAPI(apiProduct, source = 'openfoodfacts') {
        switch (source) {
            case 'openbeautyfacts':
                return {
                    id: apiProduct.code ?? apiProduct._id ?? '',
                    name: apiProduct.product_name || apiProduct.product_name_en || 'Unknown',
                    brand: apiProduct.brands || 'Unknown',
                    image: apiProduct.image_url ?? apiProduct.image_front_url ?? '',
                    category: apiProduct.categories || apiProduct.product_type || 'Skincare',
                    ingredients: this.parseInciIngredients(apiProduct),
                    benefits: [],
                    concerns: [],
                    skinTypeCompatibility: [],
                    recommendation: 'Product found in Open Beauty Facts',
                };
            case 'upcitemdb':
                return {
                    id: apiProduct.ean ?? apiProduct.upc ?? '',
                    name: apiProduct.title || 'Unknown',
                    brand: apiProduct.brand || 'Unknown',
                    image: apiProduct.images?.[0] ?? '',
                    category: apiProduct.category || 'Cosmetics',
                    ingredients: this.parseIngredients(apiProduct.description),
                    benefits: [],
                    concerns: [],
                    skinTypeCompatibility: [],
                    recommendation: 'Product found in UPCitemdb',
                };
            case 'goupc':
                return {
                    id: apiProduct.barcode ?? '',
                    name: apiProduct.name || 'Unknown',
                    brand: apiProduct.brand || 'Unknown',
                    image: apiProduct.imageUrl ?? '',
                    category: apiProduct.category || 'Cosmetics',
                    ingredients: this.parseIngredients(apiProduct.description),
                    benefits: [],
                    concerns: [],
                    skinTypeCompatibility: [],
                    recommendation: 'Product found in Go-UPC',
                };
            case 'openfoodfacts':
            default:
                return {
                    id: apiProduct.code ?? '',
                    name: apiProduct.product_name || 'Unknown',
                    brand: apiProduct.brands || 'Unknown',
                    image: apiProduct.image_url ?? '',
                    category: apiProduct.categories || 'Cosmetics',
                    ingredients: this.parseIngredients(apiProduct.ingredients_text),
                    benefits: [],
                    concerns: [],
                    skinTypeCompatibility: [],
                    recommendation: 'Product found in Open Food Facts',
                };
        }
    }
    parseInciIngredients(apiProduct) {
        if (Array.isArray(apiProduct.ingredients) &&
            apiProduct.ingredients.length > 0) {
            return apiProduct.ingredients
                .map((i) => i.text || i.id || '')
                .filter((i) => i.length > 0);
        }
        const raw = apiProduct.ingredients_text ||
            apiProduct.ingredients_text_en ||
            apiProduct.ingredients_text_fr ||
            '';
        if (!raw)
            return [];
        return raw
            .split(/[,;]/)
            .map((i) => i.trim().replace(/^\*+/, '').replace(/\.$/, ''))
            .filter((i) => i.length > 2);
    }
    parseIngredients(raw) {
        if (!raw)
            return [];
        return raw
            .split(',')
            .map((i) => i.trim())
            .filter((i) => i.length > 0);
    }
};
exports.ProductScanService = ProductScanService;
exports.ProductScanService = ProductScanService = ProductScanService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        supabase_service_1.SupabaseService,
        gemini_service_1.GeminiService])
], ProductScanService);
//# sourceMappingURL=product-scan.service.js.map