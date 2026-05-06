import { ProductScanService } from './product-scan.service';
export declare class ProductScanController {
    private readonly productScanService;
    constructor(productScanService: ProductScanService);
    private getErrorMessage;
    analyzeProductImage(file: any, imageType: 'base64' | 'file', userId: string): Promise<{
        success: boolean;
        message: string;
        data: import("./product-scan.service").Product;
        error?: undefined;
    } | {
        success: boolean;
        message: string;
        error: string;
        data?: undefined;
    }>;
    scanQRCode(qrData: string, userId: string): Promise<{
        success: boolean;
        message: string;
        data: import("./product-scan.service").Product;
        error?: undefined;
    } | {
        success: boolean;
        message: string;
        error: string;
        data?: undefined;
    }>;
    searchProduct(code: string): Promise<{
        success: boolean;
        message: string;
        data: import("./product-scan.service").Product;
        error?: undefined;
    } | {
        success: boolean;
        message: string;
        error: string;
        data?: undefined;
    }>;
    getScanHistory(page: number, limit: number, userId: string): Promise<{
        success: boolean;
        message: string;
        data: {
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
        };
        error?: undefined;
    } | {
        success: boolean;
        message: string;
        error: string;
        data?: undefined;
    }>;
    addProductToList(body: {
        productId: string;
        category?: string;
        product?: any;
    }, userId: string): Promise<{
        success: boolean;
        message: string;
        data: {
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
        };
        error?: undefined;
    } | {
        success: boolean;
        message: string;
        error: string;
        data?: undefined;
    }>;
    rateProduct(productId: string, body: {
        rating: number;
        review?: string;
    }, userId: string): Promise<{
        success: boolean;
        message: string;
        data: {
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
        };
        error?: undefined;
    } | {
        success: boolean;
        message: string;
        error: string;
        data?: undefined;
    }>;
    getDetailedAnalysis(productId: string): Promise<{
        success: boolean;
        message: string;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        message: string;
        error: string;
        data?: undefined;
    }>;
    getRecommendedProducts(category?: string, userId?: string): Promise<{
        success: boolean;
        message: string;
        data: {
            id: string;
            name: string;
            brand: string;
            category: string;
            imageUrl: string;
        }[];
        error?: undefined;
    } | {
        success: boolean;
        message: string;
        error: string;
        data?: undefined;
    }>;
    compareProducts(body: {
        productIds: string[];
    }): Promise<{
        success: boolean;
        message: string;
        data: {
            id: string;
            name: string;
            brand: string;
            category: string;
            ingredients: any;
            analysis: any;
        }[];
        error?: undefined;
    } | {
        success: boolean;
        message: string;
        error: string;
        data?: undefined;
    }>;
}
