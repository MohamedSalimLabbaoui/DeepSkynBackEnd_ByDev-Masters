import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductScanService } from './product-scan.service';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Product Scan')
@ApiBearerAuth('JWT-auth')
@Controller('product-scan')
@UseGuards(KeycloakAuthGuard)
export class ProductScanController {
  constructor(private readonly productScanService: ProductScanService) {}

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }

  @Post('analyze-image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
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
  })
  @ApiOperation({
    summary: 'Analyze product image using camera or uploaded file',
  })
  @ApiResponse({
    status: 200,
    description: 'Product analysis completed successfully',
  })
  async analyzeProductImage(
    @UploadedFile() file: any,
    @Body('imageType') imageType: 'base64' | 'file' = 'file',
    @CurrentUser('sub') userId: string,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('Image file is required');
      }

      if (!file.mimetype?.startsWith('image/')) {
        throw new BadRequestException('Only image files are allowed');
      }

      const imageData = file?.buffer || null;
      const analysis = await this.productScanService.analyzeProductImage(
        imageData,
        userId,
        imageType,
        file.mimetype,
      );

      return {
        success: true,
        message: 'Product analyzed successfully',
        data: analysis,
      };
    } catch (error) {
      const message = this.getErrorMessage(error);
      return {
        success: false,
        message: `Error analyzing product: ${message}`,
        error: message,
      };
    }
  }

  @Post('scan-qr')
  @ApiOperation({ summary: 'Scan QR code to get product information' })
  @ApiResponse({ status: 200, description: 'QR code scanned successfully' })
  async scanQRCode(
    @Body('qrData') qrData: string,
    @CurrentUser('sub') userId: string,
  ) {
    try {
      if (!qrData) {
        throw new BadRequestException('QR data is required');
      }

      const product = await this.productScanService.scanQRCode(qrData, userId);

      return {
        success: true,
        message: 'QR code scanned successfully',
        data: product,
      };
    } catch (error) {
      const message = this.getErrorMessage(error);
      return {
        success: false,
        message: `Error scanning QR code: ${message}`,
        error: message,
      };
    }
  }

  @Get('search')
  @ApiOperation({ summary: 'Search product by barcode or code' })
  @ApiResponse({ status: 200, description: 'Product found' })
  async searchProduct(@Query('code') code: string) {
    try {
      if (!code) {
        throw new BadRequestException('Product code is required');
      }

      const product = await this.productScanService.searchProductByCode(code);

      return {
        success: true,
        message: 'Product found',
        data: product,
      };
    } catch (error) {
      const message = this.getErrorMessage(error);
      return {
        success: false,
        message: `Error searching product: ${message}`,
        error: message,
      };
    }
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user scan history' })
  @ApiResponse({ status: 200, description: 'Scan history retrieved' })
  async getScanHistory(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @CurrentUser('sub') userId: string,
  ) {
    try {
      const history = await this.productScanService.getScanHistory(
        userId,
        page,
        limit,
      );

      return {
        success: true,
        message: 'Scan history retrieved',
        data: history,
      };
    } catch (error) {
      const message = this.getErrorMessage(error);
      return {
        success: false,
        message: `Error fetching scan history: ${message}`,
        error: message,
      };
    }
  }

  @Post('add-to-list')
  @ApiOperation({ summary: 'Add product to user product list' })
  @ApiResponse({ status: 200, description: 'Product added to list' })
  async addProductToList(
    @Body() body: { productId: string; category?: string; product?: any },
    @CurrentUser('sub') userId: string,
  ) {
    try {
      const result = await this.productScanService.addProductToList(
        userId,
        body.product,
        body.category || 'used',
      );

      return {
        success: true,
        message: 'Product added to list',
        data: result,
      };
    } catch (error) {
      const message = this.getErrorMessage(error);
      return {
        success: false,
        message: `Error adding product to list: ${message}`,
        error: message,
      };
    }
  }

  @Post(':productId/rate')
  @ApiOperation({ summary: 'Rate a scanned product' })
  @ApiResponse({ status: 200, description: 'Product rated' })
  async rateProduct(
    @Param('productId') productId: string,
    @Body() body: { rating: number; review?: string },
    @CurrentUser('sub') userId: string,
  ) {
    try {
      const result = await this.productScanService.rateProduct(
        productId,
        body.rating,
        body.review,
      );

      return {
        success: true,
        message: 'Product rated successfully',
        data: result,
      };
    } catch (error) {
      const message = this.getErrorMessage(error);
      return {
        success: false,
        message: `Error rating product: ${message}`,
        error: message,
      };
    }
  }

  @Get(':productId/analysis')
  @ApiOperation({ summary: 'Get detailed analysis of a product' })
  @ApiResponse({ status: 200, description: 'Detailed analysis retrieved' })
  async getDetailedAnalysis(@Param('productId') productId: string) {
    try {
      const analysis =
        await this.productScanService.getDetailedAnalysis(productId);

      return {
        success: true,
        message: 'Detailed analysis retrieved',
        data: analysis,
      };
    } catch (error) {
      const message = this.getErrorMessage(error);
      return {
        success: false,
        message: `Error fetching analysis: ${message}`,
        error: message,
      };
    }
  }

  @Get('recommendations')
  @ApiOperation({
    summary: 'Get product recommendations based on skin profile',
  })
  @ApiResponse({ status: 200, description: 'Recommendations retrieved' })
  async getRecommendedProducts(
    @Query('category') category?: string,
    @CurrentUser('sub') userId?: string,
  ) {
    try {
      const recommendations =
        await this.productScanService.getRecommendedProducts(userId, category);

      return {
        success: true,
        message: 'Recommendations retrieved',
        data: recommendations,
      };
    } catch (error) {
      const message = this.getErrorMessage(error);
      return {
        success: false,
        message: `Error fetching recommendations: ${message}`,
        error: message,
      };
    }
  }

  @Post('compare')
  @ApiOperation({ summary: 'Compare multiple products' })
  @ApiResponse({ status: 200, description: 'Products compared' })
  async compareProducts(@Body() body: { productIds: string[] }) {
    try {
      if (!body.productIds || body.productIds.length < 2) {
        throw new BadRequestException(
          'At least 2 product IDs are required for comparison',
        );
      }

      const comparison = await this.productScanService.compareProducts(
        body.productIds,
      );

      return {
        success: true,
        message: 'Products compared successfully',
        data: comparison,
      };
    } catch (error) {
      const message = this.getErrorMessage(error);
      return {
        success: false,
        message: `Error comparing products: ${message}`,
        error: message,
      };
    }
  }
}
