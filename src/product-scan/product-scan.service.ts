import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../analysis/services/supabase.service';
import {
  GeminiService,
  CosmeticProductAnalysisResult,
} from '../analysis/services/gemini.service';
import axios from 'axios';
import sharp = require('sharp');

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

@Injectable()
export class ProductScanService {
  private readonly logger = new Logger(ProductScanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
    private readonly geminiService: GeminiService,
  ) {}

  /**
   * Analyze a product image using Google Vision API and Gemini AI
   */
  async analyzeProductImage(
    imageData: string | Buffer,
    userId: string,
    imageType: 'base64' | 'file' = 'base64',
    mimeType: string = 'image/jpeg',
  ): Promise<Product> {
    try {
      this.logger.log(`Analyzing product image for user ${userId}`);

      if (!imageData) {
        throw new Error('Image data is required');
      }

      // Convert to base64 if needed
      let base64String: string;
      if (imageType === 'base64') {
        base64String = String(imageData).replace(/^data:image\/\w+;base64,/, '');
      } else {
        base64String = (imageData as Buffer).toString('base64');
      }

      // Upload image to Supabase
      const uploadResult = await this.supabaseService.uploadBase64Image(
        base64String,
        userId,
        mimeType,
        'product-scans'
      );

      this.logger.log(`Image uploaded to Supabase: ${uploadResult.path}`);

      // Create a temporary resized version for processing
      const buffer = Buffer.from(base64String, 'base64');
      const resizedBuffer = await sharp(buffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .toBuffer();
      const resizedBase64 = resizedBuffer.toString('base64');

      // Enrich with skin profile compatibility
      const userSkinProfile = await this.prisma.skinProfile.findUnique({
        where: { userId },
        select: {
          skinType: true,
          concerns: true,
          sensitivities: true,
        },
      });

      // Real product analysis using Gemini with image + skin profile context
      const analysis: CosmeticProductAnalysisResult =
        await this.geminiService.analyzeCosmeticProductImage(
          resizedBase64,
          {
            skinType: userSkinProfile?.skinType || undefined,
            concerns: userSkinProfile?.concerns || [],
            sensitivities: userSkinProfile?.sensitivities || [],
          },
          mimeType,
        );

      // Save to database
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
    } catch (error) {
      this.logger.error('Error analyzing product image:', error);
      throw error;
    }
  }

  /**
   * Scan QR code to get product information
   */
  async scanQRCode(qrData: string, userId: string): Promise<Product> {
    try {
      this.logger.log(`Scanning QR code: ${qrData}`);

      const extractedCode = this.extractProductCodeFromQrData(qrData);
      let product: Product;

      try {
        // Prefer extracted barcode/GTIN code when available.
        const codeToUse = extractedCode || qrData;
        product = await this.searchProductByCode(codeToUse);
      } catch (searchError) {
        this.logger.warn(
          `QR product lookup failed for payload "${qrData}"${
            extractedCode ? ` (extracted code: ${extractedCode})` : ''
          }. Returning fallback product.`
        );

        // Graceful fallback to keep QR flow usable even when catalog lookup fails.
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
              description:
                'Le QR a ete lu, mais aucune fiche produit correspondante n a ete trouvee dans la base externe.',
              severity: 'low',
            },
          ],
          skinTypeCompatibility: [],
          recommendation:
            'Le code QR a ete scanne avec succes. Vous pouvez analyser une photo du produit pour obtenir une analyse complete.',
        };
      }

      // Save scan to database
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
    } catch (error) {
      this.logger.error('Error scanning QR code:', error);
      throw error;
    }
  }

  /**
   * Extract a plausible product code (EAN/UPC/GTIN) from raw QR payload.
   */
  private extractProductCodeFromQrData(qrData: string): string | null {
    if (!qrData) {
      return null;
    }

    const raw = qrData.trim();

    // Direct numeric payloads (common for QR wrappers around barcodes).
    if (/^\d{8,14}$/.test(raw)) {
      return raw;
    }

    // Query params from URLs: ?ean=..., ?upc=..., ?gtin=..., ?code=...
    try {
      const url = new URL(raw);
      const candidates = ['ean', 'upc', 'gtin', 'barcode', 'code', 'product'];
      for (const key of candidates) {
        const value = url.searchParams.get(key);
        if (value && /^\d{8,14}$/.test(value)) {
          return value;
        }
      }
    } catch {
      // Not a URL; continue with free-text extraction.
    }

    // Fallback: find first plausible numeric product code in text.
    const match = raw.match(/\b\d{8,14}\b/);
    return match ? match[0] : null;
  }

  /**
   * Search product by barcode or code
   */
  async searchProductByCode(code: string): Promise<Product> {
    try {
      // Search in Open Food Facts API or similar database
      const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);

      if (response.data.product) {
        return this.formatProductFromAPI(response.data.product);
      }

      throw new Error('Product not found');
    } catch (error) {
      this.logger.error('Error searching product by code:', error);
      throw error;
    }
  }

  /**
   * Get scan history for user
   */
  async getScanHistory(userId: string, page: number = 1, limit: number = 10) {
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
    } catch (error) {
      this.logger.error('Error fetching scan history:', error);
      throw error;
    }
  }

  /**
   * Add product to user's product list
   */
  async addProductToList(userId: string, product: Product, category: string = 'used') {
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
    } catch (error) {
      this.logger.error('Error adding product to list:', error);
      throw error;
    }
  }

  /**
   * Rate a scanned product
   */
  async rateProduct(productId: string, rating: number, review?: string, userId?: string) {
    try {
      const updateData: any = { rating };
      if (review) updateData.review = review;

      const updatedScan = await this.prisma.productScan.update({
        where: { id: productId },
        data: updateData,
      });

      return updatedScan;
    } catch (error) {
      this.logger.error('Error rating product:', error);
      throw error;
    }
  }

  /**
   * Get detailed analysis of a product
   */
  async getDetailedAnalysis(productId: string) {
    try {
      const scan = await this.prisma.productScan.findUnique({
        where: { id: productId },
      });

      if (!scan) throw new Error('Product scan not found');

      return JSON.parse(scan.analysisResult || '{}');
    } catch (error) {
      this.logger.error('Error fetching detailed analysis:', error);
      throw error;
    }
  }

  /**
   * Get product recommendations based on skin profile
   */
  async getRecommendedProducts(userId: string, category?: string) {
    try {
      const userSkinProfile = await this.prisma.skinProfile.findUnique({
        where: { userId },
      });

      // Query recommended products based on skin profile
      const where: any = {};
      if (category) where.category = category;

      const products = await this.prisma.productScan.findMany({
        where: {
          ...where,
          // Filter by compatibility
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
    } catch (error) {
      this.logger.error('Error fetching recommended products:', error);
      throw error;
    }
  }

  /**
   * Compare multiple products
   */
  async compareProducts(productIds: string[]) {
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
    } catch (error) {
      this.logger.error('Error comparing products:', error);
      throw error;
    }
  }

  /**
   * Format product data from Open Food Facts API
   */
  private formatProductFromAPI(apiProduct: any): Product {
    return {
      id: apiProduct.code,
      name: apiProduct.product_name || 'Unknown',
      brand: apiProduct.brands || 'Unknown',
      image: apiProduct.image_url || '',
      category: apiProduct.categories || 'Cosmetics',
      ingredients: (apiProduct.ingredients_text || '').split(',').filter((i: string) => i.trim()),
      benefits: [],
      concerns: [],
      skinTypeCompatibility: [],
      recommendation: 'Product found in database',
    };
  }
}
