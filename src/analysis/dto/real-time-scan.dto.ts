import {
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
  IsArray,
  IsObject,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GeminiAnalysisResult } from '../services/gemini.service';

export type ScanFaceAngle = 'front' | 'left' | 'right';

export interface CapturedScanImage {
  angle: ScanFaceAngle;
  imageBase64: string;
  mimeType: string;
  imageUrl?: string | null;
}

export interface AnalysisEvolutionRemark {
  hasHistory: boolean;
  trend: 'improved' | 'declined' | 'stable';
  healthScoreChange: number;
  skinAgeChange: number;
  newConditions: string[];
  resolvedConditions: string[];
  remark: string;
}

export interface RealTimeScanResult {
  analysis: GeminiAnalysisResult;
  capturedImages: Record<ScanFaceAngle, CapturedScanImage | null>;
  evolution: AnalysisEvolutionRemark;
}

export class RealTimeScanDto {
  @ApiPropertyOptional({
    description: 'Image encodée en Base64',
    example: '/9j/4AAQSkZJRgABAQAAAQABAAD...',
  })
  @IsOptional()
  @IsString()
  image?: string; // Base64 encoded image (legacy payload)

  @ApiPropertyOptional({
    description: "Type MIME de l'image",
    enum: ['image/jpeg', 'image/png', 'image/webp'],
    default: 'image/jpeg',
  })
  @IsOptional()
  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp'], {
    message: 'Mime type must be image/jpeg, image/png, or image/webp',
  })
  mimeType?: string;

  @ApiPropertyOptional({
    description: "Sauvegarder l'image sur Supabase",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  saveImage?: boolean; // Save image to Supabase

  @ApiPropertyOptional({
    description: "Sauvegarder l'analyse dans la base de données",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  saveAnalysis?: boolean; // Save analysis to database

  @ApiPropertyOptional({
    description: 'Zones du visage qui preoccupent le plus l utilisateur',
    type: [String],
    example: ['nez', 'joues'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preocupent?: string[];

  @ApiPropertyOptional({
    description: 'Image frontale encodée en Base64',
    example: '/9j/4AAQSkZJRgABAQAAAQABAAD...',
  })
  @IsOptional()
  @IsString()
  frontImage?: string;

  @ApiPropertyOptional({
    description: 'Image profil gauche encodée en Base64',
    example: '/9j/4AAQSkZJRgABAQAAAQABAAD...',
  })
  @IsOptional()
  @IsString()
  leftImage?: string;

  @ApiPropertyOptional({
    description: 'Image profil droit encodée en Base64',
    example: '/9j/4AAQSkZJRgABAQAAAQABAAD...',
  })
  @IsOptional()
  @IsString()
  rightImage?: string;

  @ApiPropertyOptional({
    description:
      "Résultat d'analyse déjà calculé (à fournir pour sauvegarder sans relancer Gemini)",
  })
  @IsOptional()
  @IsObject()
  cachedAnalysis?: GeminiAnalysisResult;
}
