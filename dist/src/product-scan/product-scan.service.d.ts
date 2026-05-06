import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../analysis/services/supabase.service';
import { GeminiService } from '../analysis/services/gemini.service';
export interface Product {
    id: string;
    name: string;
    brand: string;
    image: string;
    category: string;
    ingredients: string[];
    benefits: {
        title: string;
        description: string;
        matchPercentage: number;
    }[];
    concerns: {
        title: string;
        description: string;
        severity: 'low' | 'medium' | 'high';
    }[];
    skinTypeCompatibility: {
        skinType: string;
        compatibility: number;
    }[];
    recommendation: string;
    price?: number;
    productUrl?: string;
}
export declare class ProductScanService {
    private readonly prisma;
    private readonly supabaseService;
    private readonly geminiService;
    private readonly logger;
    constructor(prisma: PrismaService, supabaseService: SupabaseService, geminiService: GeminiService);
    analyzeProductImage(imageData: string | Buffer, userId: string, imageType?: 'base64' | 'file', mimeType?: string): Promise<Product>;
    scanQRCode(qrData: string, userId: string): Promise<Product>;
    private extractProductCodeFromQrData;
    searchProductByCode(code: string): Promise<Product>;
    private searchOpenBeautyFacts;
    private searchOpenFoodFacts;
    private searchUPCItemDB;
    private searchGoUPC;
    getScanHistory(userId: string, page?: number, limit?: number): Promise<{
        data: {
            id: string;
            productName: string;
            brand: string;
            category: string;
            imageUrl: string;
            createdAt: Date;
            rating: number;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    addProductToList(userId: string, product: Product, category?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        ingredients: string | null;
        imageUrl: string | null;
        productName: string;
        category: string;
        brand: string | null;
        categoryType: string | null;
        productData: string | null;
        productScanId: string | null;
    }>;
    rateProduct(productId: string, rating: number, review?: string, userId?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        concerns: string | null;
        userId: string;
        ingredients: string | null;
        imageUrl: string | null;
        benefits: string | null;
        qrCode: string | null;
        productName: string;
        category: string | null;
        rating: number | null;
        brand: string | null;
        skinTypeCompatibility: string | null;
        recommendation: string | null;
        analysisResult: string | null;
        review: string | null;
    }>;
    getDetailedAnalysis(productId: string): Promise<any>;
    getRecommendedProducts(userId: string, category?: string): Promise<{
        id: string;
        name: string;
        brand: string;
        category: string;
        imageUrl: string;
    }[]>;
    compareProducts(productIds: string[]): Promise<{
        id: string;
        name: string;
        brand: string;
        category: string;
        ingredients: any;
        analysis: any;
    }[]>;
    private formatProductFromAPI;
    private parseInciIngredients;
    private parseIngredients;
}
