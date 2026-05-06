export declare class RecommendProductDto {
    stepName: string;
    stepCategory: string;
    stepDescription?: string;
    skinType?: string;
    concerns?: string;
}
export interface ProductRecommendation {
    productName: string;
    brand: string;
    description: string;
    keyIngredients: string[];
    whyRecommended: string;
    estimatedPrice: string;
    purchaseUrl: string;
    qrCodeDataUrl: string;
    rating: 'excellent' | 'good' | 'alternative';
    sourceArticles: {
        title: string;
        url: string;
    }[];
}
