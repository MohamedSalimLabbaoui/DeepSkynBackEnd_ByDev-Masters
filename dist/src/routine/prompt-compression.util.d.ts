export interface SkinContext {
    skinType?: string;
    concerns?: string[];
    sensitivities?: string[];
    fitzpatrickType?: number;
    conditions?: string[];
}
export interface WeatherContext {
    uvIndex: number;
    aqi?: number | null;
    humidity?: number | null;
    temperature?: number | null;
    city?: string;
}
export interface RoutineContext {
    type: 'AM' | 'PM' | 'weekly';
    skinType: string;
    concerns?: string[];
    sensitivities?: string[];
    budget?: string;
    preferredBrands?: string;
    fitzpatrickType?: number;
}
export declare function abbrevSkinType(skinType: string | undefined): string;
export declare function abbrevConcerns(concerns: string[] | undefined): string;
export declare function compressWhitespace(text: string): string;
export declare function buildCompactSkinContext(ctx: SkinContext): string;
export declare function buildCompactWeatherContext(ctx: WeatherContext): string;
export declare function buildCompactRoutineContext(ctx: RoutineContext): string;
export declare function compressWeatherForecast(daily: {
    time: string[];
    uv_index_max: number[];
    precipitation_sum: number[];
    temperature_2m_max: number[];
}): string;
