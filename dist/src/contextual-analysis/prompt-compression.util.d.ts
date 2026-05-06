export declare function compressWhitespace(text: string): string;
export declare function buildCompactWeatherContext(weather: {
    uvIndex: number;
    aqi?: number | null;
    humidity?: number | null;
    temperature?: number | null;
}, city?: string): string;
export declare function buildCompactSkinProfile(profile: {
    skinType?: string;
    concerns?: string[];
    fitzpatrickType?: number;
} | null): string;
