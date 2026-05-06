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
export declare class RealTimeScanDto {
    image?: string;
    mimeType?: string;
    saveImage?: boolean;
    saveAnalysis?: boolean;
    preocupent?: string[];
    frontImage?: string;
    leftImage?: string;
    rightImage?: string;
    cachedAnalysis?: GeminiAnalysisResult;
}
